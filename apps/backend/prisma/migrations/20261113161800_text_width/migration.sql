-- A default text width on sections and pages, null is narrow
-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "textWidth" TEXT;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "textWidth" TEXT;
