/**
 * Simple logging utility with colored output
 */
import chalk from 'chalk';
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
let currentLevel = 'info';
/**
 * Set the minimum log level
 */
export function setLogLevel(level) {
    currentLevel = level;
}
/**
 * Get current timestamp string
 */
function timestamp() {
    return new Date().toISOString().slice(11, 19);
}
/**
 * Check if a log level should be displayed
 */
function shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}
export const logger = {
    debug(message, ...args) {
        if (shouldLog('debug')) {
            console.log(chalk.gray(`[${timestamp()}] DEBUG:`), message, ...args);
        }
    },
    info(message, ...args) {
        if (shouldLog('info')) {
            console.log(chalk.blue(`[${timestamp()}] INFO:`), message, ...args);
        }
    },
    success(message, ...args) {
        if (shouldLog('info')) {
            console.log(chalk.green(`[${timestamp()}] ✓`), message, ...args);
        }
    },
    warn(message, ...args) {
        if (shouldLog('warn')) {
            console.log(chalk.yellow(`[${timestamp()}] WARN:`), message, ...args);
        }
    },
    error(message, ...args) {
        if (shouldLog('error')) {
            console.error(chalk.red(`[${timestamp()}] ERROR:`), message, ...args);
        }
    },
    /**
     * Log a section header
     */
    section(title) {
        console.log();
        console.log(chalk.cyan.bold(`━━━ ${title} ━━━`));
    },
    /**
     * Log a key-value pair
     */
    kv(key, value) {
        console.log(chalk.gray(`  ${key}:`), chalk.white(String(value)));
    },
    /**
     * Log a code block
     */
    code(content) {
        console.log(chalk.gray('  ┌─────────────────────────────────────'));
        content.split('\n').forEach((line) => {
            console.log(chalk.gray('  │'), line);
        });
        console.log(chalk.gray('  └─────────────────────────────────────'));
    },
};
//# sourceMappingURL=logger.js.map