/**
 * Simple logging utility with colored output
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Set the minimum log level
 */
export declare function setLogLevel(level: LogLevel): void;
export declare const logger: {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    success(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    /**
     * Log a section header
     */
    section(title: string): void;
    /**
     * Log a key-value pair
     */
    kv(key: string, value: string | number | boolean): void;
    /**
     * Log a code block
     */
    code(content: string): void;
};
//# sourceMappingURL=logger.d.ts.map