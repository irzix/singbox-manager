/**
 * CLI interface for Singbox Manager
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import { UserManager } from '../core/user-manager.js';
import { install, isInstalled, getInstalledVersion, startService, stopService, isRunning } from '../core/installer.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

const program = new Command();
const manager = new UserManager();

program
  .name('singbox-manager')
  .description('Professional Sing-box server manager with VLESS+Reality support')
  .version('1.0.0');

/**
 * Install command
 */
program
  .command('install')
  .description('Install or update Sing-box binary')
  .action(async () => {
    const result = await install();
    if (!result.success) {
      process.exit(1);
    }
  });

/**
 * Initialize command
 */
program
  .command('init')
  .description('Initialize server configuration')
  .option('-h, --host <host>', 'Server hostname or IP')
  .option('-p, --port <port>', 'Listen port', '443')
  .action(async (options) => {
    let host = options.host;

    if (!host) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'host',
          message: 'Enter server hostname or IP:',
          validate: (input: string) => input.length > 0 || 'Host is required',
        },
      ]);
      host = answers.host;
    }

    await manager.initialize(host, parseInt(options.port, 10));
    
    logger.section('Server Ready');
    logger.kv('Public Key', manager.getPublicKey() || 'N/A');
    logger.info('Share this public key with your users for manual configuration');
  });

/**
 * User add command
 */
program
  .command('user:add')
  .description('Add a new user')
  .option('-n, --name <name>', 'User name')
  .option('-e, --email <email>', 'User email')
  .option('--expires <days>', 'Expiration in days')
  .action(async (options) => {
    let name = options.name;

    if (!name) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Enter user name:',
          validate: (input: string) => input.length > 0 || 'Name is required',
        },
      ]);
      name = answers.name;
    }

    try {
      await manager.loadState();
    } catch {
      logger.error('Manager not initialized. Run "singbox-manager init" first.');
      process.exit(1);
    }

    const expiresAt = options.expires
      ? new Date(Date.now() + parseInt(options.expires, 10) * 24 * 60 * 60 * 1000)
      : undefined;

    const { user, configs } = await manager.addUser(name, {
      email: options.email,
      expiresAt,
    });

    logger.section('User Configuration');
    
    configs.forEach((config) => {
      console.log();
      console.log(chalk.yellow('Connection URI:'));
      console.log(chalk.green(config.uri));
      console.log();
      
      if (config.manual) {
        console.log(chalk.yellow('Manual Configuration:'));
        Object.entries(config.manual).forEach(([key, value]) => {
          logger.kv(key, value);
        });
      }
    });
  });

/**
 * User remove command
 */
program
  .command('user:remove <name>')
  .description('Remove a user')
  .action(async (name) => {
    try {
      await manager.loadState();
    } catch {
      logger.error('Manager not initialized.');
      process.exit(1);
    }

    const removed = await manager.removeUser(name);
    if (!removed) {
      process.exit(1);
    }
  });

/**
 * User list command
 */
program
  .command('user:list')
  .description('List all users')
  .action(async () => {
    try {
      await manager.loadState();
    } catch {
      logger.error('Manager not initialized.');
      process.exit(1);
    }

    const users = manager.getUsers();
    
    if (users.length === 0) {
      logger.info('No users found');
      return;
    }

    logger.section('Users');
    
    users.forEach((user) => {
      const status = user.enabled ? chalk.green('●') : chalk.red('●');
      const expires = user.expiresAt
        ? `expires ${user.expiresAt.toLocaleDateString()}`
        : 'no expiration';
      
      console.log(`${status} ${chalk.bold(user.name)} (${expires})`);
      console.log(chalk.gray(`   UUID: ${user.id}`));
    });

    console.log();
    const stats = manager.getStats();
    logger.kv('Total', stats.totalUsers);
    logger.kv('Active', stats.activeUsers);
    logger.kv('Disabled', stats.disabledUsers);
  });

/**
 * User show command
 */
program
  .command('user:show <name>')
  .description('Show user configuration')
  .action(async (name) => {
    try {
      await manager.loadState();
    } catch {
      logger.error('Manager not initialized.');
      process.exit(1);
    }

    const user = manager.getUser(name);
    if (!user) {
      logger.error(`User "${name}" not found`);
      process.exit(1);
    }

    logger.section(`User: ${user.name}`);
    logger.kv('UUID', user.id);
    logger.kv('Email', user.email || 'N/A');
    logger.kv('Status', user.enabled ? 'Active' : 'Disabled');
    logger.kv('Created', user.createdAt.toISOString());
    logger.kv('Expires', user.expiresAt?.toISOString() || 'Never');

    const configs = manager.getClientConfigs(name);
    
    configs.forEach((config) => {
      console.log();
      console.log(chalk.yellow('Connection URI:'));
      console.log(chalk.green(config.uri));
    });
  });

/**
 * User enable/disable commands
 */
program
  .command('user:enable <name>')
  .description('Enable a user')
  .action(async (name) => {
    try {
      await manager.loadState();
      await manager.setUserEnabled(name, true);
    } catch {
      logger.error('Failed to enable user');
      process.exit(1);
    }
  });

program
  .command('user:disable <name>')
  .description('Disable a user')
  .action(async (name) => {
    try {
      await manager.loadState();
      await manager.setUserEnabled(name, false);
    } catch {
      logger.error('Failed to disable user');
      process.exit(1);
    }
  });

/**
 * Service commands
 */
program
  .command('start')
  .description('Start Sing-box service')
  .action(() => {
    if (!isInstalled()) {
      logger.error('Sing-box not installed. Run "singbox-manager install" first.');
      process.exit(1);
    }

    if (isRunning()) {
      logger.warn('Sing-box is already running');
      return;
    }

    startService('/etc/singbox-manager/config.json');
  });

program
  .command('stop')
  .description('Stop Sing-box service')
  .action(() => {
    stopService();
  });

program
  .command('status')
  .description('Show service status')
  .action(() => {
    logger.section('Service Status');
    
    const installed = isInstalled();
    const version = getInstalledVersion();
    const running = isRunning();

    logger.kv('Installed', installed ? 'Yes' : 'No');
    if (version) {
      logger.kv('Version', version);
    }
    logger.kv('Running', running ? 'Yes' : 'No');
  });

export { program };
