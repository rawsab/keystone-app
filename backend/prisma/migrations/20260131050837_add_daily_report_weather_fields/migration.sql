-- AlterTable
ALTER TABLE "daily_reports" ADD COLUMN     "weather_observed_flags" JSONB,
ADD COLUMN     "weather_observed_text" TEXT,
ADD COLUMN     "weather_snapshot" JSONB,
ADD COLUMN     "weather_snapshot_source" TEXT,
ADD COLUMN     "weather_snapshot_taken_at" TIMESTAMPTZ(6),
ADD COLUMN     "weather_summary_text" TEXT;
