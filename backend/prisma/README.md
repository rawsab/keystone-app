# Keystone Database Schema

This directory contains the Prisma schema and migrations for Keystone Stage 1.

## Schema Overview

The database schema is defined in `schema.prisma` and matches the specification in `docs/04_DATA_MODEL.md`.

### Tables

1. **companies** - Tenant boundary
2. **users** - Users belonging to companies (CITEXT email for case-insensitive)
3. **projects** - Construction projects
4. **project_members** - User-project membership mapping
5. **daily_reports** - Daily work reports
6. **file_objects** - File metadata (actual files in S3)
7. **daily_report_attachments** - Files attached to reports
8. **audit_events** - Append-only audit log

### Key Features

- **Multi-tenancy**: All tenant-scoped tables include `company_id`
- **CITEXT**: Email addresses use CITEXT for case-insensitive uniqueness
- **Indexes**: Composite indexes start with `company_id` for optimal query performance
- **Constraints**: Unique constraints enforce business rules (e.g., one report per date)
- **Soft Deletes**: `deleted_at` column on mutable entities

## Database Setup

### Prerequisites

- PostgreSQL 14+ running locally or accessible remotely
- Database created (e.g., `keystone_dev`)

### Environment Configuration

Ensure `DATABASE_URL` is set in `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/keystone_dev
```

### Running Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npm run prisma:reset
```

### Initial Migration

The initial migration (`20260129192544_init`) includes:

1. **CITEXT Extension**: Enables case-insensitive text for email addresses
2. **All Stage 1 Tables**: Creates all 8 tables with proper types
3. **Indexes**: All indexes from the data model specification
4. **Foreign Keys**: Proper relationships between tables
5. **Constraints**: Unique constraints for business rules

## Schema Validation

The schema has been validated against `docs/04_DATA_MODEL.md`:

✅ All tables present
✅ All columns with correct types
✅ All unique constraints
✅ All indexes (company_id leading)
✅ CITEXT for case-insensitive email
✅ Proper foreign key relationships
✅ Soft delete support (deleted_at)
✅ Timestamps (created_at, updated_at)

## Development Workflow

### Making Schema Changes

1. Update `schema.prisma`
2. Create migration: `npm run prisma:migrate -- --name description_of_change`
3. Review generated SQL in `prisma/migrations/`
4. Apply migration (automatically done by migrate command)
5. Regenerate client: `npm run prisma:generate`

### Prisma Studio

Prisma Studio provides a GUI for viewing and editing data:

```bash
npm run prisma:studio
```

Access at: http://localhost:5555

## Multi-Tenancy Notes

Every query MUST be scoped by `company_id`. The schema enforces this through:

- Composite indexes starting with `company_id`
- Unique constraints including `company_id`
- Foreign keys maintaining tenant boundaries

Example safe query:

```typescript
const projects = await prisma.project.findMany({
  where: {
    companyId: user.companyId, // ALWAYS scope by company
    status: 'ACTIVE',
  },
});
```

## CITEXT Implementation

The `users.email` column uses PostgreSQL's CITEXT extension for case-insensitive email addresses.

Benefits:
- `user@example.com` and `USER@EXAMPLE.COM` are treated as identical
- Enforced at database level
- No application-level normalization needed

The CITEXT extension is enabled in the initial migration:
```sql
CREATE EXTENSION IF NOT EXISTS citext;
```
