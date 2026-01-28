/**
 * User management module
 * Handles creation, deletion, and management of proxy users
 */
import { User, ServerConfig, ClientConfig } from '../types/index.js';
/**
 * User Manager class
 * Manages users and generates configurations
 */
export declare class UserManager {
    private state;
    private statePath;
    private configPath;
    constructor(statePath?: string, configPath?: string);
    /**
     * Initialize the manager with server configuration
     */
    initialize(host: string, port?: number): Promise<void>;
    /**
     * Load state from disk
     */
    loadState(): Promise<void>;
    /**
     * Save state to disk
     */
    saveState(): Promise<void>;
    /**
     * Regenerate and save Sing-box configuration
     */
    regenerateConfig(): Promise<void>;
    /**
     * Add a new user
     */
    addUser(name: string, options?: {
        email?: string;
        expiresAt?: Date;
        trafficLimit?: number;
    }): Promise<{
        user: User;
        configs: ClientConfig[];
    }>;
    /**
     * Remove a user
     */
    removeUser(nameOrId: string): Promise<boolean>;
    /**
     * Enable or disable a user
     */
    setUserEnabled(nameOrId: string, enabled: boolean): Promise<boolean>;
    /**
     * Get all users
     */
    getUsers(): User[];
    /**
     * Get a specific user
     */
    getUser(nameOrId: string): User | undefined;
    /**
     * Get client configs for a user
     */
    getClientConfigs(nameOrId: string): ClientConfig[];
    /**
     * Get server configuration
     */
    getServerConfig(): ServerConfig;
    /**
     * Get Reality public key (for sharing with users)
     */
    getPublicKey(): string | undefined;
    /**
     * Export user config as shareable string
     */
    exportUserConfig(nameOrId: string): string | undefined;
    /**
     * Get statistics
     */
    getStats(): {
        totalUsers: number;
        activeUsers: number;
        disabledUsers: number;
    };
}
//# sourceMappingURL=user-manager.d.ts.map