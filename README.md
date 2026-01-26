# Singbox Manager

A professional Sing-box server manager with VLESS+Reality support for bypassing internet censorship.

## Features

- 🚀 **Easy Installation**: One-command Sing-box binary installation
- 🔐 **VLESS+Reality**: Latest and most secure protocol
- 👥 **User Management**: Add, remove, enable/disable users
- 📱 **Client Configs**: Auto-generate connection URIs for clients
- 🐳 **Docker Support**: Ready-to-use Docker configuration
- 📝 **TypeScript**: Fully typed, professional codebase

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/singbox-manager.git
cd singbox-manager

# Start with Docker Compose
docker-compose up -d

# Initialize server
docker exec -it singbox-manager node dist/index.js init --host YOUR_SERVER_IP

# Add a user
docker exec -it singbox-manager node dist/index.js user:add --name "user1"

# Start the proxy
docker exec -it singbox-manager node dist/index.js start
```

### Manual Installation

```bash
# Install dependencies
npm install

# Build
npm run build

# Install Sing-box binary
sudo node dist/index.js install

# Initialize server
sudo node dist/index.js init --host YOUR_SERVER_IP

# Add a user
sudo node dist/index.js user:add --name "user1"

# Start service
sudo node dist/index.js start
```

## CLI Commands

### Installation & Service

| Command | Description |
|---------|-------------|
| `install` | Install or update Sing-box binary |
| `init --host <ip>` | Initialize server configuration |
| `start` | Start Sing-box service |
| `stop` | Stop Sing-box service |
| `status` | Show service status |

### User Management

| Command | Description |
|---------|-------------|
| `user:add --name <name>` | Add a new user |
| `user:remove <name>` | Remove a user |
| `user:list` | List all users |
| `user:show <name>` | Show user configuration |
| `user:enable <name>` | Enable a user |
| `user:disable <name>` | Disable a user |

## Client Configuration

After adding a user, you'll receive a VLESS URI like:

```
vless://uuid@server:443?type=tcp&security=reality&pbk=...&fp=chrome&sni=www.google.com&sid=...&flow=xtls-rprx-vision#username
```

### Supported Clients

| Platform | Client |
|----------|--------|
| iOS | Shadowrocket, Stash |
| Android | v2rayNG, NekoBox |
| Windows | v2rayN, Clash Verge |
| macOS | ClashX Meta, V2rayU |
| Linux | Clash Meta, sing-box |

## Configuration Files

| Path | Description |
|------|-------------|
| `/etc/singbox-manager/config.json` | Sing-box configuration |
| `/etc/singbox-manager/state.json` | Manager state (users, keys) |

## Security

- **Reality Protocol**: Mimics legitimate TLS traffic to popular websites
- **No Central Server**: Direct P2P-like connection
- **Encrypted**: All traffic is encrypted with TLS 1.3
- **Unique Keys**: Each server generates unique Reality keys

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Singbox Manager                       │
├─────────────────────────────────────────────────────────┤
│  CLI Interface (Commander.js)                           │
├─────────────────────────────────────────────────────────┤
│  Core Modules                                           │
│  ├── Installer      - Binary management                 │
│  ├── UserManager    - User CRUD operations              │
│  └── ConfigGenerator - Sing-box config generation       │
├─────────────────────────────────────────────────────────┤
│  Sing-box Binary (Go)                                   │
│  └── VLESS + Reality Protocol                           │
└─────────────────────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## License

MIT License - Free to use for helping people access information.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a PR.

## Disclaimer

This tool is for educational and humanitarian purposes. Users are responsible for complying with local laws and regulations.
