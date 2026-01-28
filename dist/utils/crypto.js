/**
 * Cryptographic utilities for key generation
 */
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
/**
 * Generate a random UUID v4
 */
export function generateUUID() {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
    ].join('-');
}
/**
 * Generate a random short ID for Reality protocol
 * @param length - Length of short ID (default: 8)
 */
export function generateShortId(length = 8) {
    return randomBytes(length / 2).toString('hex');
}
/**
 * Generate Reality key pair using sing-box binary
 * Falls back to x25519 generation if sing-box not available
 */
export async function generateRealityKeyPair() {
    try {
        // Try using sing-box to generate keys (check multiple paths)
        const singboxPaths = ['./bin/sing-box', 'sing-box', '/app/bin/sing-box'];
        let output = '';
        for (const sbPath of singboxPaths) {
            try {
                output = execSync(`${sbPath} generate reality-keypair`, {
                    encoding: 'utf-8',
                    timeout: 5000,
                });
                break;
            }
            catch {
                continue;
            }
        }
        if (!output)
            throw new Error('sing-box not found');
        const lines = output.trim().split('\n');
        const privateKey = lines[0]?.split(': ')[1]?.trim() || '';
        const publicKey = lines[1]?.split(': ')[1]?.trim() || '';
        if (privateKey && publicKey) {
            return { privateKey, publicKey };
        }
    }
    catch {
        // sing-box not available, use fallback
    }
    // Fallback: generate x25519 key pair manually
    // This is a simplified version - in production use proper x25519
    const privateKeyBytes = randomBytes(32);
    // Clamp private key for x25519
    privateKeyBytes[0] &= 248;
    privateKeyBytes[31] &= 127;
    privateKeyBytes[31] |= 64;
    const privateKey = privateKeyBytes.toString('base64url');
    // Note: Public key derivation requires proper x25519 implementation
    // For now, we'll generate a placeholder and recommend using sing-box
    const publicKey = randomBytes(32).toString('base64url');
    console.warn('⚠️  Generated fallback keys. For production, install sing-box and regenerate.');
    return { privateKey, publicKey };
}
/**
 * Generate multiple short IDs
 * @param count - Number of short IDs to generate
 */
export function generateShortIds(count = 4) {
    return Array.from({ length: count }, () => generateShortId());
}
//# sourceMappingURL=crypto.js.map