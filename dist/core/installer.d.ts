/**
 * Sing-box binary installer
 * Downloads and installs the sing-box binary for the current platform
 */
/** Installation result */
export interface InstallResult {
    success: boolean;
    version?: string;
    path?: string;
    error?: string;
}
/**
 * Check if sing-box is already installed
 */
export declare function isInstalled(): boolean;
/**
 * Get installed sing-box version
 */
export declare function getInstalledVersion(): string | null;
/**
 * Install sing-box binary
 */
export declare function install(installDir?: string): Promise<InstallResult>;
/**
 * Start sing-box service
 */
export declare function startService(configPath: string): void;
/**
 * Stop sing-box service
 */
export declare function stopService(): void;
/**
 * Check if sing-box is running
 */
export declare function isRunning(): boolean;
//# sourceMappingURL=installer.d.ts.map