# ClawPond - ZeroClaw Instance Management Dashboard

A Next.js application for managing multiple ZeroClaw instances through Docker containers. ClawPond provides a web interface for creating, monitoring, and managing ZeroClaw AI agent instances with full lifecycle control and configuration management.

## Features

- **Instance Management**: Create, start, stop, restart, and delete ZeroClaw instances
- **Configuration Editor**: Full TOML configuration editor with tabbed interface
- **Real-time Monitoring**: Auto-refreshing dashboard showing instance status
- **Docker Integration**: Direct Docker container management via Dockerode
- **Resource Monitoring**: CPU and memory usage tracking for running instances
- **Port Management**: Automatic port assignment for new instances
- **Quick Connect**: One-click connection to running instances
- **Authentication**: Secure password-protected dashboard

## Quick Start with Docker Compose

1. **Generate auth secret**:
   ```bash
   openssl rand -hex 32 > .auth_secret
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env and set:
   # AUTH_SECRET=$(cat .auth_secret)
   # AUTH_PASSWORD=your-secure-password
   ```

3. **Start with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

4. **Access the dashboard**:
   - Open http://localhost:3000
   - Login with your password

### Services

- **clawpond**: Management dashboard (port 3000)

## Docker Build

### Using Build Scripts

**Build script** - Build local images:
```bash
# Build with default settings (clawpond:latest)
./scripts/build.sh

# Build with custom tag
./scripts/build.sh -t v1.0.0

# Build and push to registry
./scripts/build.sh -r ghcr.io/your-username -p
```

**Release script** - Build and publish to registry:
```bash
# Uses version from package.json
./scripts/release.sh
```

### Manual Build

```bash
# Build the image
docker build -t clawpond:latest .

# Run the container
docker run -d \
  --name clawpond \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v clawpond_workspace:/app/workspace \
  -e AUTH_SECRET=$(openssl rand -hex 32) \
  -e AUTH_PASSWORD=your-password \
  clawpond:latest
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_SECRET` | JWT secret key (required) | - |
| `AUTH_PASSWORD` | Dashboard password | `admin` |
| `WORKSPACE_ROOT` | Workspace directory | `./workspace` |
| `CLAWPOND_PORT` | Dashboard port | `3000` |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with password
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/logout` - Logout

### Containers
- `GET /api/containers` - List all ZeroClaw instances
- `POST /api/containers` - Create a new instance
- `GET /api/containers/[id]` - Get instance stats
- `PATCH /api/containers/[id]` - Perform action (start/stop/restart)
- `DELETE /api/containers/[id]` - Delete instance
- `PUT /api/containers/[id]/config` - Update instance configuration
- `GET /api/containers/[id]/logs` - Get container logs

## Usage

1. **Login**: Enter your password to access the dashboard

2. **Create Instance**: Click "New Instance" and configure:
   - Instance name
   - Port (optional, auto-assigned if empty)
   - Provider and API key (optional)

3. **Manage Instances**:
   - Start/Stop/Restart instances from the instance card
   - Click "Connect" to open the instance web interface
   - Click the settings icon to edit configuration

4. **Monitor**:
   - Dashboard auto-refreshes every 5 seconds
   - View CPU and memory usage for running instances

## License

MIT
