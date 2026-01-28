/**
 * Cryptographic utilities for key generation
 */
/**
 * Generate a random UUID v4
 */
export declare function generateUUID(): string;
/**
 * Generate a random short ID for Reality protocol
 * @param length - Length of short ID (default: 8)
 */
export declare function generateShortId(length?: number): string;
/**
 * Generate Reality key pair using sing-box binary
 * Falls back to x25519 generation if sing-box not available
 */
export declare function generateRealityKeyPair(): Promise<{
    privateKey: string;
    publicKey: string;
}>;
/**
 * Generate multiple short IDs
 * @param count - Number of short IDs to generate
 */
export declare function generateShortIds(count?: number): string[];
//# sourceMappingURL=crypto.d.ts.map