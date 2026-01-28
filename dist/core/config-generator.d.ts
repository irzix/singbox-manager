/**
 * Sing-box configuration generator
 * Generates server and client configurations for VLESS+Reality
 */
import { User, ServerConfig, InboundConfig, RealityConfig, SingboxConfig, ClientConfig } from '../types/index.js';
/**
 * Generate a new Reality configuration
 */
export declare function generateRealityConfig(dest?: string): Promise<RealityConfig>;
/**
 * Generate default server configuration
 */
export declare function generateDefaultServerConfig(host: string, port?: number): Promise<ServerConfig>;
/**
 * Convert our config format to Sing-box native format
 */
export declare function toSingboxConfig(serverConfig: ServerConfig, users: User[]): SingboxConfig;
/**
 * Generate VLESS URI for client
 */
export declare function generateVlessUri(user: User, serverConfig: ServerConfig, inbound: InboundConfig): string;
/**
 * Generate client configuration for a user
 */
export declare function generateClientConfig(user: User, serverConfig: ServerConfig): ClientConfig[];
/**
 * Save Sing-box configuration to file
 */
export declare function saveConfig(config: SingboxConfig, path: string): Promise<void>;
/**
 * Load Sing-box configuration from file
 */
export declare function loadConfig(path: string): Promise<SingboxConfig>;
//# sourceMappingURL=config-generator.d.ts.map