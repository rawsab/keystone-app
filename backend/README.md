# Keystone Backend

NestJS backend API for Keystone Stage 1.

## Tech Stack

- **Framework**: NestJS with Fastify adapter
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js LTS

## Getting Started

### Prerequisites

- Node.js LTS (v18 or higher)
- npm

### Installation

```bash
npm install
```

### Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration values. See [Configuration](#configuration) section for details.

### Development

```bash
# Run in development mode
npm run start:dev

# Build for production
npm run build

# Start production build
npm start
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## Project Structure

```
src/
  common/
    filters/          # Global exception filters
    interfaces/       # Shared TypeScript interfaces
  config/             # Configuration and env validation
    config.module.ts  # Config module
    env.schema.ts     # Environment variable schema
    env.service.ts    # Type-safe config service
  modules/
    health/           # Health check module
  app.module.ts       # Root application module
  main.ts            # Application entry point
```

## API Conventions

### Base URL
```
/api/v1
```

### Standard Response Shape
```json
{
  "data": <object | array | null>,
  "error": null
}
```

### Error Response Shape
```json
{
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## Available Endpoints

### Health Check
```
GET /api/v1/health
```

Returns system health status.

**Response:**
```json
{
  "data": { "ok": true },
  "error": null
}
```

## Configuration

The application uses environment variables for configuration. All required variables are validated at startup.

### Required Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `AWS_REGION` - AWS region for S3 (e.g., `us-east-1`)
- `S3_BUCKET` - S3 bucket name for file storage

### Optional Environment Variables

- `PORT` - Server port (default: `3000`)
- `AWS_ACCESS_KEY_ID` - AWS access key (optional in dev, use IAM roles in production)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (optional in dev, use IAM roles in production)

### Environment Validation

The application will fail to start if any required environment variable is missing or invalid. Error messages clearly indicate which variables need to be configured.

Example error:
```
Environment validation failed:
  JWT_SECRET: Invalid input: expected string, received undefined
  AWS_REGION: Invalid input: expected string, received undefined
```
