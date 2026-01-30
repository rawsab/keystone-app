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

**Note:** You must be logged in to access the app. On first visit, you'll be redirected to `/login`.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
app/
  (auth)/          # Unauthenticated routes
    login/         # Login page
    register/      # Registration page
    layout.tsx     # Auth layout
  (app)/           # Authenticated app routes
    layout.tsx     # Route guard + app shell
    page.tsx       # Dashboard
    projects/      # Projects section
      page.tsx     # Project list (W4)
    settings/      # Settings section
      page.tsx     # Settings (future)
  layout.tsx       # Root layout with providers
components/
  ui/              # shadcn/ui components (generated)
    button.tsx
    card.tsx
    alert.tsx
    skeleton.tsx
    sheet.tsx
    dropdown-menu.tsx
    separator.tsx
    badge.tsx
  app/
    layout/        # App shell components
      AppShell.tsx
      AppHeader.tsx
      AppSidebar.tsx
      MobileSidebar.tsx
    HealthCheck.tsx
lib/
  api/
    auth.ts        # Token storage (Bearer MVP)
    client.ts      # Base API client with auth
    types.ts       # API response types
    errors.ts      # Error handling utilities
    endpoints/
      health.ts    # Health check endpoint
      auth.ts      # Auth endpoints (login, signup, me)
  providers/
    query-provider.tsx
    theme-provider.tsx
    session-provider.tsx  # Session management
  routes.ts        # Centralized route definitions
```

---

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
