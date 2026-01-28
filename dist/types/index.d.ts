/**
 * Core type definitions for Singbox Manager
 */
/** Supported proxy protocols */
export type Protocol = 'vless' | 'vmess' | 'trojan' | 'shadowsocks' | 'hysteria2';
/** Transport layer types */
export type Transport = 'tcp' | 'ws' | 'grpc' | 'http';
/** TLS configuration types */
export type TLSType = 'tls' | 'reality' | 'none';
/**
 * User configuration
 */
export interface User {
    /** Unique user identifier (UUID) */
    id: string;
    /** Display name */
    name: string;
    /** User email for identification */
    email?: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Expiration timestamp (optional) */
    expiresAt?: Date;
    /** Whether user is active */
    enabled: boolean;
    /** Traffic limit in bytes (0 = unlimited) */
    trafficLimit: number;
    /** Traffic used in bytes */
    trafficUsed: number;
}
/**
 * Reality TLS configuration
 */
export interface RealityConfig {
    /** Target website to mimic (e.g., "www.google.com") */
    dest: string;
    /** Server names for SNI */
    serverNames: string[];
    /** Private key (base64) */
    privateKey: string;
    /** Public key (base64) */
    publicKey: string;
    /** Short IDs for multiplexing */
    shortIds: string[];
}
/**
 * Server inbound configuration
 */
export interface InboundConfig {
    /** Inbound tag/name */
    tag: string;
    /** Protocol type */
    protocol: Protocol;
    /** Listen address */
    listen: string;
    /** Listen port */
    port: number;
    /** Transport configuration */
    transport?: Transport;
    /** TLS type */
    tlsType: TLSType;
    /** Reality config (if tlsType is 'reality') */
    reality?: RealityConfig;
}
/**
 * Complete server configuration
 */
export interface ServerConfig {
    /** Server hostname or IP */
    host: string;
    /** Inbound configurations */
    inbounds: InboundConfig[];
    /** DNS configuration */
    dns?: DNSConfig;
    /** Log level */
    logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'panic';
}
/**
 * DNS configuration
 */
export interface DNSConfig {
    /** DNS servers */
    servers: string[];
    /** Use system DNS as fallback */
    useSystemDns: boolean;
}
/**
 * Client connection string/config
 */
export interface ClientConfig {
    /** User this config belongs to */
    userId: string;
    /** Protocol */
    protocol: Protocol;
    /** Connection URI (e.g., vless://...) */
    uri: string;
    /** QR code data */
    qrCode?: string;
    /** Human-readable config for manual setup */
    manual?: Record<string, string | number>;
}
/**
 * Manager state persisted to disk
 */
export interface ManagerState {
    /** Version for migrations */
    version: number;
    /** Server configuration */
    server: ServerConfig;
    /** Registered users */
    users: User[];
    /** Generated client configs */
    clientConfigs: ClientConfig[];
}
/**
 * Sing-box native config format (partial)
 */
export interface SingboxConfig {
    log?: {
        level?: string;
        timestamp?: boolean;
    };
    dns?: {
        servers?: Array<{
            tag: string;
            address: string;
        }>;
    };
    inbounds?: SingboxInbound[];
    outbounds?: SingboxOutbound[];
}
export interface SingboxInbound {
    type: string;
    tag: string;
    listen: string;
    listen_port: number;
    users?: Array<{
        uuid?: string;
        name?: string;
        flow?: string;
    }>;
    tls?: {
        enabled: boolean;
        server_name?: string;
        reality?: {
            enabled: boolean;
            handshake?: {
                server: string;
                server_port: number;
            };
            private_key: string;
            short_id: string[];
        };
    };
}
export interface SingboxOutbound {
    type: string;
    tag: string;
}
//# sourceMappingURL=index.d.ts.map