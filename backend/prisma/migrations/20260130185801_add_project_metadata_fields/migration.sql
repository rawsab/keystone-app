-- AlterTable: Add new project metadata fields with defaults
ALTER TABLE "projects" ADD COLUMN "project_number" TEXT NOT NULL DEFAULT '',
ADD COLUMN "company_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN "address_line_1" TEXT NOT NULL DEFAULT '',
ADD COLUMN "address_line_2" TEXT,
ADD COLUMN "city" TEXT NOT NULL DEFAULT '',
ADD COLUMN "region" TEXT NOT NULL DEFAULT '',
ADD COLUMN "postal_code" TEXT NOT NULL DEFAULT '',
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Canada';

-- Backfill existing projects with placeholder data
UPDATE "projects" 
SET 
  "project_number" = 'PRJ-' || SUBSTRING(id::text, 1, 8),
  "company_name" = (SELECT name FROM companies WHERE id = "projects".company_id),
  "address_line_1" = COALESCE(location, 'To Be Updated'),
  "city" = 'To Be Updated',
  "region" = 'To Be Updated',
  "postal_code" = 'TBD'
WHERE "project_number" = '' OR "company_name" = '' OR "address_line_1" = '';

-- CreateIndex: Add unique constraint on company_id and project_number
CREATE UNIQUE INDEX "projects_company_id_project_number_key" ON "projects"("company_id", "project_number");

-- CreateIndex: Add index on company_id and name
CREATE INDEX "projects_company_id_name_idx" ON "projects"("company_id", "name");
