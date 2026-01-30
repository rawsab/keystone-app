# Keystone Web App

Next.js frontend for Keystone construction management.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript** (strict)
- **Tailwind CSS**
- **shadcn/ui** (component system)
- **TanStack Query v5** (data fetching)
- **Lucide React** (icons)

## Getting Started

### Prerequisites

- Node.js 18+
- Backend running on `http://localhost:3000`

### Installation

```bash
npm install
```

### Environment Setup

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Default configuration:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

The dashboard will be served at the root path `/`.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
app/
  (auth)/          # Unauthenticated routes (future)
  (app)/           # Authenticated app routes
    layout.tsx     # App shell with sidebar + header
    page.tsx       # Dashboard
  layout.tsx       # Root layout with providers
components/
  ui/              # shadcn/ui components (generated)
  app/
    layout/        # App shell components
      AppShell.tsx
      AppHeader.tsx
      AppSidebar.tsx
    HealthCheck.tsx
lib/
  api/
    client.ts      # Base API client
    types.ts       # API response types
    errors.ts      # Error handling utilities
    endpoints/
      health.ts    # Health check endpoint
  providers/
    query-provider.tsx
    theme-provider.tsx
    auth-provider.tsx (stub)
```

## Development Guidelines

### API Calls

All API calls must go through the centralized client:

```typescript
import { apiClient } from "@/lib/api/client";

// Good
const response = await apiClient.get("/endpoint");

// Bad - never do this
const response = await fetch("...");
```

### UI Components

Use shadcn/ui for all UI components:

```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Good
<Button variant="default">Click me</Button>

// Bad - never create custom buttons
<button className="...">Click me</button>
```

### Error Handling

Follow the error state patterns:

```typescript
const { data, isLoading, isError, error } = useQuery(...);

// Always handle all states
if (isLoading) return <Skeleton />;
if (isError) return <ErrorState error={error} />;
if (!data) return <EmptyState />;
return <SuccessView data={data} />;
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler
