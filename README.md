# OpenClaw - ZeroClaw Instance Management Dashboard

A Next.js application for managing multiple ZeroClaw instances through Docker containers. OpenClaw provides a web interface for creating, monitoring, and managing ZeroClaw AI agent instances with full lifecycle control and configuration management.

## Features

- **Instance Management**: Create, start, stop, restart, and delete ZeroClaw instances
- **Configuration Editor**: Full TOML configuration editor with tabbed interface
- **Real-time Monitoring**: Auto-refreshing dashboard showing instance status
- **Docker Integration**: Direct Docker container management via Dockerode
- **Resource Monitoring**: CPU and memory usage tracking for running instances
- **Port Management**: Automatic port assignment for new instances
- **Quick Connect**: One-click connection to running instances

## Architecture

```
openclaw/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── containers/
│   │   │       ├── route.ts              # GET all containers, POST create instance
│   │   │       └── [id]/
│   │   │           ├── route.ts          # GET stats, PATCH actions, DELETE
│   │   │           ├── config/route.ts   # PUT update config
│   │   │           └── logs/route.ts     # GET container logs
│   │   ├── page.tsx                      # Main dashboard
│   │   └── globals.css                   # Tailwind styles
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components
│   │   ├── InstanceCard.tsx              # Instance card component
│   │   ├── ConfigEditor.tsx              # Configuration editor dialog
│   │   └── CreateInstanceDialog.tsx      # Create instance dialog
│   ├── lib/
│   │   ├── utils.ts                      # Utility functions
│   │   └── docker.service.ts             # Docker service class
│   └── types/
│       └── index.ts                      # TypeScript types
└── package.json
```

## Prerequisites

- Docker installed and running
- Node.js 18+ and npm
- Docker socket access (for container management)
- `ghcr.io/zeroclaw-labs/zeroclaw:latest` image available

## Installation

```bash
cd openclaw
npm install
```

## Development

```bash
npm run dev
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000).

## Docker Permissions

The application requires access to the Docker socket. Make sure your user has permission:

```bash
sudo usermod -aG docker $USER
```

Then log out and back in for the changes to take effect.

### Automatic User Permissions

OpenClaw automatically detects your user ID (UID) and group ID (GID) when creating containers, ensuring that container files are owned by your user rather than root. This prevents permission errors when containers create files in mounted volumes.

The application:
1. Automatically detects the current user's UID/GID on startup
2. Passes these values to containers via the `User` field in Docker config
3. Alternatively, you can manually specify `HOST_UID` and `HOST_GID` environment variables

Example manual override:
```bash
HOST_UID=1000 HOST_GID=1000 npm run dev
```

### Server Host Configuration

By default, the "Connect" button uses the current page's hostname (e.g., `localhost` or the IP address you used to access the dashboard). You can specify a custom server host using the `NEXT_PUBLIC_SERVER_HOST` environment variable:

```bash
# Use specific IP address
NEXT_PUBLIC_SERVER_HOST=192.168.1.20 npm run dev

# Or add to .env.local file
echo "NEXT_PUBLIC_SERVER_HOST=192.168.1.20" >> .env.local
```

## Configuration

Each ZeroClaw instance can be configured with:

- **Provider Settings**: Default provider, model, temperature
- **Autonomy Settings**: Autonomy level, workspace restrictions, command limits
- **Security Settings**: Memory limits, CPU limits, audit logging
- **Memory Settings**: Backend type, auto-save, retention policies
- **Gateway Settings**: Port, host binding, pairing requirements

## API Endpoints

### Containers

- `GET /api/containers` - List all ZeroClaw instances
- `POST /api/containers` - Create a new instance
- `GET /api/containers/[id]` - Get instance stats
- `PATCH /api/containers/[id]` - Perform action (start/stop/restart)
- `DELETE /api/containers/[id]` - Delete instance
- `PUT /api/containers/[id]/config` - Update instance configuration
- `GET /api/containers/[id]/logs` - Get container logs

## Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Create Instance**: Click "New Instance" and configure:
   - Instance name
   - Port (optional, auto-assigned if empty)
   - Provider and API key (optional)

2. **Manage Instances**:
   - Start/Stop/Restart instances from the instance card
   - Click "Connect" to open the instance web interface
   - Click the settings icon to edit configuration

3. **Monitor**:
   - Dashboard auto-refreshes every 5 seconds
   - View CPU and memory usage for running instances
   - Check instance status via colored indicators

## License

MIT
