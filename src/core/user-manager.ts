/**
 * User management module
 * Handles creation, deletion, and management of proxy users
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { User, ManagerState, ServerConfig, ClientConfig } from '../types/index.js';
import { generateUUID } from '../utils/crypto.js';
import { generateClientConfig, generateDefaultServerConfig, toSingboxConfig, saveConfig } from './config-generator.js';
import { logger } from '../utils/logger.js';

/** Default state file path */
const DEFAULT_STATE_PATH = '/etc/singbox-manager/state.json';
const DEFAULT_CONFIG_PATH = '/etc/singbox-manager/config.json';

/**
 * User Manager class
 * Manages users and generates configurations
 */
export class UserManager {
  private state: ManagerState;
  private statePath: string;
  private configPath: string;

  constructor(statePath?: string, configPath?: string) {
    this.statePath = statePath || DEFAULT_STATE_PATH;
    this.configPath = configPath || DEFAULT_CONFIG_PATH;
    this.state = {
      version: 1,
      server: {
        host: '',
        inbounds: [],
        logLevel: 'info',
      },
      users: [],
      clientConfigs: [],
    };
  }

  /**
   * Initialize the manager with server configuration
   */
  async initialize(host: string, port: number = 443): Promise<void> {
    logger.section('Initializing User Manager');

    // Check if state already exists
    if (existsSync(this.statePath)) {
      logger.info('Loading existing state...');
      await this.loadState();
      logger.success('State loaded');
      return;
    }

    // Generate new server configuration
    logger.info('Generating new server configuration...');
    this.state.server = await generateDefaultServerConfig(host, port);
    
    await this.saveState();
    await this.regenerateConfig();

    logger.success('Manager initialized');
    logger.kv('Host', host);
    logger.kv('Port', port);
    logger.kv('Protocol', 'VLESS + Reality');
  }

  /**
   * Load state from disk
   */
  async loadState(): Promise<void> {
    const content = await readFile(this.statePath, 'utf-8');
    this.state = JSON.parse(content) as ManagerState;
    
    // Convert date strings back to Date objects
    this.state.users = this.state.users.map((u) => ({
      ...u,
      createdAt: new Date(u.createdAt),
      expiresAt: u.expiresAt ? new Date(u.expiresAt) : undefined,
    }));
  }

  /**
   * Save state to disk
   */
  async saveState(): Promise<void> {
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(this.statePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  /**
   * Regenerate and save Sing-box configuration
   */
  async regenerateConfig(): Promise<void> {
    const singboxConfig = toSingboxConfig(this.state.server, this.state.users);
    await saveConfig(singboxConfig, this.configPath);
  }

  /**
   * Add a new user
   */
  async addUser(
    name: string,
    options?: {
      email?: string;
      expiresAt?: Date;
      trafficLimit?: number;
    }
  ): Promise<{ user: User; configs: ClientConfig[] }> {
    logger.section('Adding New User');

    // Check for duplicate name
    if (this.state.users.some((u) => u.name === name)) {
      throw new Error(`User "${name}" already exists`);
    }

    const user: User = {
      id: generateUUID(),
      name,
      email: options?.email,
      createdAt: new Date(),
      expiresAt: options?.expiresAt,
      enabled: true,
      trafficLimit: options?.trafficLimit || 0,
      trafficUsed: 0,
    };

    this.state.users.push(user);

    // Generate client configs
    const configs = generateClientConfig(user, this.state.server);
    this.state.clientConfigs.push(...configs);

    await this.saveState();
    await this.regenerateConfig();

    logger.success(`User "${name}" created`);
    logger.kv('UUID', user.id);
    logger.kv('Expires', user.expiresAt?.toISOString() || 'Never');

    return { user, configs };
  }

  /**
   * Remove a user
   */
  async removeUser(nameOrId: string): Promise<boolean> {
    const index = this.state.users.findIndex(
      (u) => u.name === nameOrId || u.id === nameOrId
    );

    if (index === -1) {
      logger.warn(`User "${nameOrId}" not found`);
      return false;
    }

    const user = this.state.users[index];
    this.state.users.splice(index, 1);

    // Remove associated client configs
    this.state.clientConfigs = this.state.clientConfigs.filter(
      (c) => c.userId !== user.id
    );

    await this.saveState();
    await this.regenerateConfig();

    logger.success(`User "${user.name}" removed`);
    return true;
  }

  /**
   * Enable or disable a user
   */
  async setUserEnabled(nameOrId: string, enabled: boolean): Promise<boolean> {
    const user = this.state.users.find(
      (u) => u.name === nameOrId || u.id === nameOrId
    );

    if (!user) {
      logger.warn(`User "${nameOrId}" not found`);
      return false;
    }

    user.enabled = enabled;
    await this.saveState();
    await this.regenerateConfig();

    logger.success(`User "${user.name}" ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  /**
   * Get all users
   */
  getUsers(): User[] {
    return [...this.state.users];
  }

  /**
   * Get a specific user
   */
  getUser(nameOrId: string): User | undefined {
    return this.state.users.find(
      (u) => u.name === nameOrId || u.id === nameOrId
    );
  }

  /**
   * Get client configs for a user
   */
  getClientConfigs(nameOrId: string): ClientConfig[] {
    const user = this.getUser(nameOrId);
    if (!user) return [];

    return this.state.clientConfigs.filter((c) => c.userId === user.id);
  }

  /**
   * Get server configuration
   */
  getServerConfig(): ServerConfig {
    return { ...this.state.server };
  }

  /**
   * Get Reality public key (for sharing with users)
   */
  getPublicKey(): string | undefined {
    const inbound = this.state.server.inbounds.find(
      (i) => i.tlsType === 'reality'
    );
    return inbound?.reality?.publicKey;
  }

  /**
   * Export user config as shareable string
   */
  exportUserConfig(nameOrId: string): string | undefined {
    const configs = this.getClientConfigs(nameOrId);
    if (configs.length === 0) return undefined;

    return configs[0].uri;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalUsers: number;
    activeUsers: number;
    disabledUsers: number;
  } {
    const users = this.state.users;
    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.enabled).length,
      disabledUsers: users.filter((u) => !u.enabled).length,
    };
  }
}
