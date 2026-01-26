/**
 * Simple logging utility with colored output
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

/**
 * Set the minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get current timestamp string
 */
function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

/**
 * Check if a log level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      console.log(chalk.gray(`[${timestamp()}] DEBUG:`), message, ...args);
    }
  },

  info(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(chalk.blue(`[${timestamp()}] INFO:`), message, ...args);
    }
  },

  success(message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      console.log(chalk.green(`[${timestamp()}] ✓`), message, ...args);
    }
  },

  warn(message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      console.log(chalk.yellow(`[${timestamp()}] WARN:`), message, ...args);
    }
  },

  error(message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      console.error(chalk.red(`[${timestamp()}] ERROR:`), message, ...args);
    }
  },

  /**
   * Log a section header
   */
  section(title: string): void {
    console.log();
    console.log(chalk.cyan.bold(`━━━ ${title} ━━━`));
  },

  /**
   * Log a key-value pair
   */
  kv(key: string, value: string | number | boolean): void {
    console.log(chalk.gray(`  ${key}:`), chalk.white(String(value)));
  },

  /**
   * Log a code block
   */
  code(content: string): void {
    console.log(chalk.gray('  ┌─────────────────────────────────────'));
    content.split('\n').forEach((line) => {
      console.log(chalk.gray('  │'), line);
    });
    console.log(chalk.gray('  └─────────────────────────────────────'));
  },
};
