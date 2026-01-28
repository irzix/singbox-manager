/**
 * Simple HTTP API for managing sing-box users
 * Runs alongside sing-box in Docker
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import {
  generateDefaultServerConfig,
  toSingboxConfig,
  generateClientConfig,
  saveConfig,
} from './core/config-generator.js';
import { generateUUID } from './utils/crypto.js';
import { User, ManagerState } from './types/index.js';

import { execSync } from 'child_process';
import { spawn, ChildProcess } from 'child_process';

const PORT = process.env.API_PORT || 3000;
const STATE_PATH = process.env.STATE_PATH || '/tmp/state.json';
const CONFIG_PATH = process.env.CONFIG_PATH || '/tmp/config.json';

let state: ManagerState;

async function loadState(): Promise<ManagerState> {
  if (existsSync(STATE_PATH)) {
    const data = await readFile(STATE_PATH, 'utf-8');
    return JSON.parse(data);
  }
  
  const host = process.env.SERVER_HOST || '0.0.0.0';
  const port = parseInt(process.env.SERVER_PORT || '443');
  const server = await generateDefaultServerConfig(host, port);
  
  return {
    version: 1,
    server,
    users: [],
    clientConfigs: [],
  };
}

async function saveState(): Promise<void> {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

async function updateSingboxConfig(): Promise<void> {
  const config = toSingboxConfig(state.server, state.users);
  await saveConfig(config, CONFIG_PATH);
  
  // Reload sing-box
  try {
    execSync('pkill -HUP sing-box', { stdio: 'pipe' });
  } catch {
    // sing-box might not be running yet
  }
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data, null, 2));
}

function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method || 'GET';

  // CORS
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // Web UI
    if (path === '/' && method === 'GET') {
      sendHtml(res, getWebUI());
      return;
    }

    // API: List users
    if (path === '/api/users' && method === 'GET') {
      const users = state.users.map(u => ({
        id: u.id,
        name: u.name,
        enabled: u.enabled,
        createdAt: u.createdAt,
      }));
      sendJson(res, { users });
      return;
    }

    // API: Add user
    if (path === '/api/users' && method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const { name } = JSON.parse(body || '{}');
      
      if (!name) {
        sendJson(res, { error: 'Name is required' }, 400);
        return;
      }

      const user: User = {
        id: generateUUID(),
        name,
        createdAt: new Date(),
        enabled: true,
        trafficLimit: 0,
        trafficUsed: 0,
      };

      state.users.push(user);
      await saveState();
      await updateSingboxConfig();

      const configs = generateClientConfig(user, state.server);
      
      sendJson(res, { 
        user: { id: user.id, name: user.name },
        configs,
      });
      return;
    }

    // API: Get user config
    if (path.startsWith('/api/users/') && path.endsWith('/config') && method === 'GET') {
      const userId = path.split('/')[3];
      const user = state.users.find(u => u.id === userId);
      
      if (!user) {
        sendJson(res, { error: 'User not found' }, 404);
        return;
      }

      const configs = generateClientConfig(user, state.server);
      sendJson(res, { user: { id: user.id, name: user.name }, configs });
      return;
    }

    // API: Delete user
    if (path.startsWith('/api/users/') && method === 'DELETE') {
      const userId = path.split('/')[3];
      const index = state.users.findIndex(u => u.id === userId);
      
      if (index === -1) {
        sendJson(res, { error: 'User not found' }, 404);
        return;
      }

      state.users.splice(index, 1);
      await saveState();
      await updateSingboxConfig();

      sendJson(res, { success: true });
      return;
    }

    // API: Server info
    if (path === '/api/server' && method === 'GET') {
      sendJson(res, {
        host: state.server.host,
        port: state.server.inbounds[0]?.port,
        publicKey: state.server.inbounds[0]?.reality?.publicKey,
      });
      return;
    }

    // API: Reset server (regenerate keys)
    if (path === '/api/reset' && method === 'POST') {
      const host = process.env.SERVER_HOST || '0.0.0.0';
      const port = parseInt(process.env.SERVER_PORT || '443');
      state.server = await generateDefaultServerConfig(host, port);
      state.users = [];
      await saveState();
      await updateSingboxConfig();
      
      // Restart sing-box
      if (singboxProcess) {
        singboxProcess.kill();
        singboxProcess = null;
      }
      setTimeout(() => startSingbox(), 1000);
      
      sendJson(res, { success: true, message: 'Server reset, new keys generated' });
      return;
    }

    sendJson(res, { error: 'Not found' }, 404);
  } catch (error) {
    console.error('Request error:', error);
    sendJson(res, { error: 'Internal server error' }, 500);
  }
}

function getWebUI(): string {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sing-box Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      background: #1a1a2e; 
      color: #eee;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 30px; color: #00d9ff; }
    .card {
      background: #16213e;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; color: #888; }
    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #0f0f23;
      color: #fff;
      font-size: 16px;
    }
    button {
      background: #00d9ff;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    }
    button:hover { background: #00b8d9; }
    button.danger { background: #ff4757; color: #fff; }
    .user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: #0f0f23;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .config-box {
      background: #0f0f23;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
      word-break: break-all;
      font-family: monospace;
      font-size: 12px;
    }
    .copy-btn {
      background: #4CAF50;
      padding: 8px 16px;
      font-size: 14px;
      margin-top: 10px;
    }
    .hidden { display: none; }
    #message {
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    }
    #message.success { background: #4CAF50; }
    #message.error { background: #ff4757; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Sing-box Manager</h1>
    
    <div id="message" class="hidden"></div>
    
    <div class="card" style="background:#2d1f1f;border:1px solid #ff4757">
      <h2>⚠️ تنظیمات سرور</h2>
      <p style="color:#888;margin:10px 0">اگه کانکشن کار نمیکنه، کلیدها رو دوباره بساز:</p>
      <button class="danger" onclick="resetServer()">🔄 ریست کامل سرور</button>
    </div>
    
    <div class="card">
      <h2>➕ افزودن کاربر جدید</h2>
      <form id="addUserForm">
        <div class="form-group">
          <label>نام کاربر</label>
          <input type="text" id="userName" placeholder="مثال: موبایل من" required>
        </div>
        <button type="submit">افزودن</button>
      </form>
    </div>

    <div class="card">
      <h2>👥 کاربران</h2>
      <div id="usersList"></div>
    </div>

    <div id="configModal" class="card hidden">
      <h2>🔗 لینک اتصال</h2>
      <div id="configContent"></div>
    </div>
  </div>

  <script>
    const API = '';
    
    function showMessage(text, type) {
      const msg = document.getElementById('message');
      msg.textContent = text;
      msg.className = type;
      setTimeout(() => msg.className = 'hidden', 3000);
    }

    async function loadUsers() {
      try {
        const res = await fetch(API + '/api/users');
        const data = await res.json();
        const list = document.getElementById('usersList');
        
        if (data.users.length === 0) {
          list.innerHTML = '<p style="color:#888;text-align:center">هنوز کاربری اضافه نشده</p>';
          return;
        }
        
        list.innerHTML = data.users.map(u => \`
          <div class="user-item">
            <span>\${u.name}</span>
            <div>
              <button onclick="showConfig('\${u.id}')">نمایش لینک</button>
              <button class="danger" onclick="deleteUser('\${u.id}')">حذف</button>
            </div>
          </div>
        \`).join('');
      } catch (e) {
        showMessage('خطا در بارگذاری', 'error');
      }
    }

    async function showConfig(userId) {
      try {
        const res = await fetch(API + '/api/users/' + userId + '/config');
        const data = await res.json();
        const modal = document.getElementById('configModal');
        const content = document.getElementById('configContent');
        
        const uri = data.configs[0]?.uri || '';
        content.innerHTML = \`
          <p><strong>\${data.user.name}</strong></p>
          <div class="config-box" id="configUri">\${uri}</div>
          <button class="copy-btn" onclick="copyConfig()">📋 کپی لینک</button>
        \`;
        modal.classList.remove('hidden');
      } catch (e) {
        showMessage('خطا در دریافت کانفیگ', 'error');
      }
    }

    function copyConfig() {
      const uri = document.getElementById('configUri').textContent;
      navigator.clipboard.writeText(uri);
      showMessage('کپی شد!', 'success');
    }

    async function deleteUser(userId) {
      if (!confirm('آیا مطمئن هستید؟')) return;
      try {
        await fetch(API + '/api/users/' + userId, { method: 'DELETE' });
        showMessage('کاربر حذف شد', 'success');
        loadUsers();
        document.getElementById('configModal').classList.add('hidden');
      } catch (e) {
        showMessage('خطا در حذف', 'error');
      }
    }

    document.getElementById('addUserForm').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('userName').value;
      try {
        const res = await fetch(API + '/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        document.getElementById('userName').value = '';
        showMessage('کاربر اضافه شد!', 'success');
        loadUsers();
        
        // Show config immediately
        const modal = document.getElementById('configModal');
        const content = document.getElementById('configContent');
        const uri = data.configs[0]?.uri || '';
        content.innerHTML = \`
          <p><strong>\${data.user.name}</strong></p>
          <div class="config-box" id="configUri">\${uri}</div>
          <button class="copy-btn" onclick="copyConfig()">📋 کپی لینک</button>
        \`;
        modal.classList.remove('hidden');
      } catch (e) {
        showMessage('خطا: ' + e.message, 'error');
      }
    };

    async function resetServer() {
      if (!confirm('همه کاربران و تنظیمات پاک میشن. مطمئنی؟')) return;
      try {
        const res = await fetch(API + '/api/reset', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showMessage('سرور ریست شد! صفحه رو رفرش کن', 'success');
          setTimeout(() => location.reload(), 2000);
        }
      } catch (e) {
        showMessage('خطا در ریست', 'error');
      }
    }

    loadUsers();
  </script>
</body>
</html>`;
}

let singboxProcess: ChildProcess | null = null;

function startSingbox(): void {
  if (singboxProcess) return;
  
  // Find sing-box binary
  const singboxPaths = ['./bin/sing-box', '/app/bin/sing-box', 'sing-box'];
  let singboxPath = '';
  
  for (const p of singboxPaths) {
    try {
      execSync(`${p} version`, { stdio: 'pipe' });
      singboxPath = p;
      break;
    } catch {
      continue;
    }
  }
  
  if (!singboxPath) {
    console.error('sing-box binary not found!');
    return;
  }
  
  console.log(`Starting sing-box from ${singboxPath}...`);
  singboxProcess = spawn(singboxPath, ['run', '-c', CONFIG_PATH], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  
  singboxProcess.stdout?.on('data', (data) => console.log('[sing-box]', data.toString().trim()));
  singboxProcess.stderr?.on('data', (data) => console.error('[sing-box]', data.toString().trim()));
  singboxProcess.on('exit', (code) => {
    console.log(`sing-box exited with code ${code}`);
    singboxProcess = null;
  });
}

async function main(): Promise<void> {
  state = await loadState();
  await saveState();
  await updateSingboxConfig();
  
  // Start sing-box
  startSingbox();
  
  const server = createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`Management API running on http://0.0.0.0:${PORT}`);
  });
}

main().catch(console.error);
