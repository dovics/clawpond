# ClawPond API Guide for AI Agents

This guide provides AI Agents with the essential information needed to interact with the ClawPond API for managing ZeroClaw/OpenClaw AI agent instances.

## Quick Reference

### Authentication

All API requests require authentication using a Bearer token:

```http
Authorization: Bearer <your-token>
```

Include this header in every API request.

### API Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/containers` | List all instances |
| `POST` | `/api/containers` | Create new instance |
| `GET` | `/api/containers/[id]` | Get instance statistics |
| `PATCH` | `/api/containers/[id]` | Control instance (start/stop/restart) |
| `DELETE` | `/api/containers/[id]` | Delete instance |
| `PUT` | `/api/containers/[id]/config` | Update configuration |
| `PUT` | `/api/containers/[id]/limits` | Update resource limits |
| `GET` | `/api/templates` | List templates |
| `POST` | `/api/templates` | Create template |
| `DELETE` | `/api/templates/[id]` | Delete template |

### Core Data Structures

#### Instance Object
```json
{
  "id": "string",
  "name": "string",
  "containerId": "string",
  "status": "running|stopped|exited|created|unknown",
  "port": number,
  "config": { ... },
  "createdAt": "ISO8601 timestamp",
  "memoryLimit": number,
  "cpuLimit": number
}
```

#### Create Instance Request
```json
{
  "name": "string",
  "port": number,
  "apiKey": "string",
  "provider": "string",
  "model": "string",
  "baseUrl": "string",
  "temperature": number,
  "config": { ... },
  "memoryLimit": number,
  "cpuLimit": number
}
```

## Task-Oriented Guide

### Create Instance

Create a new ZeroClaw instance with optional template-based configuration.

**Request:**
```http
POST /api/containers
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "my-agent",
  "port": 8080,
  "apiKey": "sk-...",
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "memoryLimit": 2048,
  "cpuLimit": 1.0
}
```

**Key Parameters:**
- `name` (required): Instance name
- `port` (optional): External port, auto-assigned if omitted
- `apiKey` (optional): LLM provider API key
- `provider` (optional): LLM provider (anthropic, openai, etc.)
- `model` (optional): Model identifier
- `memoryLimit` (optional): Memory limit in MB
- `cpuLimit` (optional): CPU limit in cores

**Response:**
```json
{
  "id": "inst-123",
  "name": "my-agent",
  "status": "created",
  "containerId": "container-456",
  "port": 8080
}
```

### List Instances

Retrieve all ZeroClaw instances with their current status.

**Request:**
```http
GET /api/containers
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "inst-1",
    "name": "agent-1",
    "status": "running",
    "port": 8080,
    "memoryLimit": 2048,
    "cpuLimit": 1.0,
    "createdAt": "2025-03-14T10:00:00Z"
  }
]
```

### Start Instance

Start a stopped instance.

**Request:**
```http
PATCH /api/containers/{containerId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "start"
}
```

**Response:**
```json
{
  "success": true
}
```

### Stop Instance

Stop a running instance gracefully.

**Request:**
```http
PATCH /api/containers/{containerId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "stop"
}
```

**Response:**
```json
{
  "success": true
}
```

### Restart Instance

Restart a running instance.

**Request:**
```http
PATCH /api/containers/{containerId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "restart"
}
```

**Response:**
```json
{
  "success": true
}
```

### Update Configuration

Update instance configuration. This may recreate the container.

**Request:**
```http
PUT /api/containers/{containerId}/config
Content-Type: application/json
Authorization: Bearer <token>

{
  "default_provider": "anthropic",
  "default_model": "claude-sonnet-4-6",
  "default_temperature": 0.7,
  "autonomy": {
    "level": "medium",
    "max_actions_per_hour": 100
  }
}
```

**Key Configuration Sections:**
- `default_provider`: LLM provider
- `default_model`: Model identifier
- `autonomy`: Agent autonomy settings
- `security`: Security and sandbox settings
- `channels_config`: Communication channels
- `web_search`: Web search configuration

**Response:**
```json
{
  "containerId": "new-container-id",
  "message": "Configuration updated"
}
```

### Update Resource Limits

Update memory and CPU limits for an instance.

**Request:**
```http
PUT /api/containers/{containerId}/limits
Content-Type: application/json
Authorization: Bearer <token>

{
  "memoryLimit": 4096,
  "cpuLimit": 2.0,
  "port": 8081
}
```

**Parameters:**
- `memoryLimit`: Memory limit in MB
- `cpuLimit`: CPU cores (e.g., 0.5, 1.0, 2.0)
- `port`: External port mapping

**Response:**
```json
{
  "success": true
}
```

### Delete Instance

Delete an instance and optionally its workspace.

**Request:**
```http
DELETE /api/containers/{containerId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "deleteWorkspace": true
}
```

**Parameters:**
- `deleteWorkspace`: Also delete workspace directory (default: false)

**Response:**
```json
{
  "success": true,
  "workspaceDeleted": true
}
```

### List Templates

List all available templates for instance creation.

**Request:**
```http
GET /api/templates
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "tpl-1",
    "name": "basic-agent",
    "description": "Basic agent configuration",
    "config": { ... }
  }
]
```

### Create Template

Create a template from an existing instance or configuration.

**Request:**
```http
POST /api/templates
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "my-template",
  "description": "Custom agent template",
  "config": {
    "default_provider": "anthropic",
    "default_model": "claude-sonnet-4-6"
  },
  "sourceInstanceId": "inst-123"
}
```

**Parameters:**
- `name` (required): Template name
- `description` (optional): Template description
- `config` (required): Configuration object
- `sourceInstanceId` (optional): Instance to create template from

**Response:**
```json
{
  "id": "tpl-456",
  "name": "my-template",
  "description": "Custom agent template"
}
```

### Delete Template

Delete a template.

**Request:**
```http
DELETE /api/templates/{templateId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

## Best Practices

### Resource Management

- **Start with conservative limits**: Begin with 1-2 CPU cores and 2-4GB memory
- **Scale based on usage**: Monitor and adjust limits based on actual usage patterns
- **Port allocation**: Let the system auto-assign ports when creating multiple instances

### Configuration Updates

- **Atomic updates**: Update entire configuration sections rather than individual fields
- **Container recreation**: Be aware that config updates may recreate containers
- **Template usage**: Use templates for reproducible instance configurations

### Batch Operations

- **Sequential creation**: Create instances sequentially to avoid port conflicts
- **Status polling**: Poll instance status after operations to verify completion
- **Error recovery**: Implement retry logic for transient failures

### Instance Lifecycle

1. **Create**: Use templates for consistent configuration
2. **Configure**: Apply configuration after creation
3. **Start**: Start the configured instance
4. **Monitor**: Check instance status periodically
5. **Stop**: Stop gracefully when not needed
6. **Delete**: Clean up unused instances and workspaces

### Common Workflows

**Deploy new agent from template:**
1. List available templates
2. Create instance with template ID
3. Update configuration if needed
4. Start instance
5. Verify status

**Scale existing agent:**
1. Stop instance
2. Update resource limits
3. Restart instance
4. Verify new limits applied

**Clean up:**
1. Stop instance
2. Delete with workspace cleanup
3. Verify deletion completed
