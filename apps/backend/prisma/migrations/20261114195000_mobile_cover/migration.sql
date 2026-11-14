-- An optional portrait cover for the top of a project page on phones, null
-- uses the cover. No backfill, existing projects keep using their cover
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "mobileCoverId" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_mobileCoverId_fkey" FOREIGN KEY ("mobileCoverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
