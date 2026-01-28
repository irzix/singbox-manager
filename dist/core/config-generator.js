/**
 * Sing-box configuration generator
 * Generates server and client configurations for VLESS+Reality
 */
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { generateShortIds, generateRealityKeyPair } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
/** Default Reality target sites (popular, stable, TLS 1.3) */
const DEFAULT_REALITY_TARGETS = [
    'www.google.com',
    'www.microsoft.com',
    'www.apple.com',
    'www.amazon.com',
];
/**
 * Generate a new Reality configuration
 */
export async function generateRealityConfig(dest) {
    const { privateKey, publicKey } = await generateRealityKeyPair();
    const target = dest || DEFAULT_REALITY_TARGETS[0];
    return {
        dest: target,
        serverNames: [target],
        privateKey,
        publicKey,
        shortIds: generateShortIds(4),
    };
}
/**
 * Generate default server configuration
 */
export async function generateDefaultServerConfig(host, port = 443) {
    const reality = await generateRealityConfig();
    return {
        host,
        inbounds: [
            {
                tag: 'vless-reality',
                protocol: 'vless',
                listen: '0.0.0.0',
                port,
                tlsType: 'reality',
                reality,
            },
        ],
        dns: {
            servers: ['8.8.8.8', '1.1.1.1'],
            useSystemDns: false,
        },
        logLevel: 'info',
    };
}
/**
 * Convert our config format to Sing-box native format
 */
export function toSingboxConfig(serverConfig, users) {
    const inbounds = serverConfig.inbounds.map((inbound) => {
        const base = {
            type: inbound.protocol,
            tag: inbound.tag,
            listen: inbound.listen,
            listen_port: inbound.port,
            users: users
                .filter((u) => u.enabled)
                .map((u) => ({
                uuid: u.id,
                name: u.name,
                flow: 'xtls-rprx-vision',
            })),
        };
        if (inbound.tlsType === 'reality' && inbound.reality) {
            base.tls = {
                enabled: true,
                server_name: inbound.reality.serverNames[0],
                reality: {
                    enabled: true,
                    handshake: {
                        server: inbound.reality.dest,
                        server_port: 443,
                    },
                    private_key: inbound.reality.privateKey,
                    short_id: inbound.reality.shortIds,
                },
            };
        }
        return base;
    });
    return {
        log: {
            level: serverConfig.logLevel,
            timestamp: true,
        },
        dns: {
            servers: serverConfig.dns?.servers.map((s, i) => ({
                tag: `dns-${i}`,
                address: s,
            })),
        },
        inbounds,
        outbounds: [
            { type: 'direct', tag: 'direct' },
            { type: 'block', tag: 'block' },
        ],
    };
}
/**
 * Generate VLESS URI for client
 */
export function generateVlessUri(user, serverConfig, inbound) {
    if (inbound.protocol !== 'vless' || inbound.tlsType !== 'reality') {
        throw new Error('Only VLESS+Reality is supported');
    }
    const reality = inbound.reality;
    const params = new URLSearchParams({
        type: 'tcp',
        security: 'reality',
        pbk: reality.publicKey,
        fp: 'chrome',
        sni: reality.serverNames[0],
        sid: reality.shortIds[0],
        flow: 'xtls-rprx-vision',
    });
    const uri = `vless://${user.id}@${serverConfig.host}:${inbound.port}?${params.toString()}#${encodeURIComponent(user.name)}`;
    return uri;
}
/**
 * Generate client configuration for a user
 */
export function generateClientConfig(user, serverConfig) {
    return serverConfig.inbounds.map((inbound) => ({
        userId: user.id,
        protocol: inbound.protocol,
        uri: generateVlessUri(user, serverConfig, inbound),
        manual: {
            address: serverConfig.host,
            port: inbound.port,
            uuid: user.id,
            flow: 'xtls-rprx-vision',
            security: 'reality',
            sni: inbound.reality?.serverNames[0] || '',
            fingerprint: 'chrome',
            publicKey: inbound.reality?.publicKey || '',
            shortId: inbound.reality?.shortIds[0] || '',
        },
    }));
}
/**
 * Save Sing-box configuration to file
 */
export async function saveConfig(config, path) {
    const dir = dirname(path);
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
    await writeFile(path, JSON.stringify(config, null, 2), 'utf-8');
    logger.success(`Configuration saved to ${path}`);
}
/**
 * Load Sing-box configuration from file
 */
export async function loadConfig(path) {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
}
//# sourceMappingURL=config-generator.js.map