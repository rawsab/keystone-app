-- DropIndex
DROP INDEX "file_objects_company_id_project_id_created_at_idx";

-- AlterTable
ALTER TABLE "file_objects" ADD COLUMN     "folder_id" UUID;

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "project_id" UUID,
    "parent_folder_id" UUID,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folders_company_id_project_id_parent_folder_id_idx" ON "folders"("company_id", "project_id", "parent_folder_id");

-- CreateIndex
CREATE INDEX "folders_company_id_parent_folder_id_idx" ON "folders"("company_id", "parent_folder_id");

-- CreateIndex
CREATE INDEX "file_objects_company_id_project_id_folder_id_created_at_idx" ON "file_objects"("company_id", "project_id", "folder_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
