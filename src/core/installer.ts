/**
 * Sing-box binary installer
 * Downloads and installs the sing-box binary for the current platform
 */

import { execSync, spawn } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, chmodSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { platform, arch } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { logger } from '../utils/logger.js';

/** Sing-box release information */
interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  checksumUrl: string;
}

/** Installation result */
export interface InstallResult {
  success: boolean;
  version?: string;
  path?: string;
  error?: string;
}

/** Default installation directory */
const DEFAULT_INSTALL_DIR = '/usr/local/bin';
const SINGBOX_BINARY = 'sing-box';

/**
 * Get the platform-specific download URL
 */
function getPlatformInfo(): { os: string; arch: string; ext: string } {
  const os = platform();
  const cpuArch = arch();

  let osName: string;
  let archName: string;
  let ext: string;

  switch (os) {
    case 'linux':
      osName = 'linux';
      ext = 'tar.gz';
      break;
    case 'darwin':
      osName = 'darwin';
      ext = 'tar.gz';
      break;
    case 'win32':
      osName = 'windows';
      ext = 'zip';
      break;
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }

  switch (cpuArch) {
    case 'x64':
      archName = 'amd64';
      break;
    case 'arm64':
      archName = 'arm64';
      break;
    case 'arm':
      archName = 'armv7';
      break;
    default:
      throw new Error(`Unsupported architecture: ${cpuArch}`);
  }

  return { os: osName, arch: archName, ext };
}

/**
 * Fetch the latest sing-box release info from GitHub
 */
async function getLatestRelease(): Promise<ReleaseInfo> {
  const response = await fetch(
    'https://api.github.com/repos/SagerNet/sing-box/releases/latest'
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch release info: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    tag_name: string;
    assets: Array<{ name: string; browser_download_url: string }>;
  };

  const version = data.tag_name.replace('v', '');
  const { os, arch: archName, ext } = getPlatformInfo();

  const assetName = `sing-box-${version}-${os}-${archName}.${ext}`;
  const asset = data.assets.find((a) => a.name === assetName);

  if (!asset) {
    throw new Error(`No release found for ${os}-${archName}`);
  }

  return {
    version,
    downloadUrl: asset.browser_download_url,
    checksumUrl: asset.browser_download_url.replace(`.${ext}`, '.sha256'),
  };
}

/**
 * Download a file from URL
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const fileStream = createWriteStream(destPath);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pipeline(response.body as any, fileStream);
}

/**
 * Extract the sing-box binary from archive
 */
async function extractBinary(
  archivePath: string,
  destDir: string
): Promise<string> {
  const { ext } = getPlatformInfo();

  if (ext === 'tar.gz') {
    execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: 'pipe' });
  } else if (ext === 'zip') {
    execSync(`unzip -o "${archivePath}" -d "${destDir}"`, { stdio: 'pipe' });
  }

  // Find the extracted binary
  const extractedDir = execSync(`ls "${destDir}" | grep sing-box`, {
    encoding: 'utf-8',
  }).trim();

  return join(destDir, extractedDir, SINGBOX_BINARY);
}

/**
 * Check if sing-box is already installed
 */
export function isInstalled(): boolean {
  try {
    execSync('which sing-box', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get installed sing-box version
 */
export function getInstalledVersion(): string | null {
  try {
    const output = execSync('sing-box version', { encoding: 'utf-8' });
    const match = output.match(/sing-box version (\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Install sing-box binary
 */
export async function install(
  installDir: string = DEFAULT_INSTALL_DIR
): Promise<InstallResult> {
  const tempDir = '/tmp/singbox-install';

  try {
    logger.section('Installing Sing-box');

    // Check if already installed
    const currentVersion = getInstalledVersion();
    if (currentVersion) {
      logger.info(`Sing-box ${currentVersion} is already installed`);
    }

    // Get latest release
    logger.info('Fetching latest release info...');
    const release = await getLatestRelease();
    logger.kv('Latest version', release.version);

    if (currentVersion === release.version) {
      logger.success('Already up to date!');
      return {
        success: true,
        version: currentVersion,
        path: join(installDir, SINGBOX_BINARY),
      };
    }

    // Create temp directory
    await rm(tempDir, { recursive: true, force: true });
    await mkdir(tempDir, { recursive: true });

    // Download archive
    const { ext } = getPlatformInfo();
    const archivePath = join(tempDir, `sing-box.${ext}`);

    logger.info('Downloading...');
    await downloadFile(release.downloadUrl, archivePath);
    logger.success('Download complete');

    // Extract binary
    logger.info('Extracting...');
    const binaryPath = await extractBinary(archivePath, tempDir);

    // Install binary
    if (!existsSync(installDir)) {
      mkdirSync(installDir, { recursive: true });
    }

    const destPath = join(installDir, SINGBOX_BINARY);
    execSync(`cp "${binaryPath}" "${destPath}"`, { stdio: 'pipe' });
    chmodSync(destPath, 0o755);

    // Cleanup
    await rm(tempDir, { recursive: true, force: true });

    logger.success(`Sing-box ${release.version} installed successfully!`);
    logger.kv('Binary path', destPath);

    return {
      success: true,
      version: release.version,
      path: destPath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Installation failed: ${message}`);

    // Cleanup on error
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Start sing-box service
 */
export function startService(configPath: string): void {
  logger.info('Starting sing-box service...');

  const process = spawn('sing-box', ['run', '-c', configPath], {
    detached: true,
    stdio: 'ignore',
  });

  process.unref();
  logger.success(`Sing-box started with PID ${process.pid}`);
}

/**
 * Stop sing-box service
 */
export function stopService(): void {
  try {
    execSync('pkill -f sing-box', { stdio: 'pipe' });
    logger.success('Sing-box stopped');
  } catch {
    logger.warn('No running sing-box process found');
  }
}

/**
 * Check if sing-box is running
 */
export function isRunning(): boolean {
  try {
    execSync('pgrep -f sing-box', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
