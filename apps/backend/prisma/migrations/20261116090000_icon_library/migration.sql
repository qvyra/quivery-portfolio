-- Built-in icons from the site's icon library by key, next to the uploaded
-- icon relations. Existing rows keep their values, nothing is rewritten

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "iconKey" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "iconKey" TEXT;

-- AlterTable
ALTER TABLE "ContactLink" ADD COLUMN     "iconId" TEXT,
ADD COLUMN     "iconKey" TEXT;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "navIconId" TEXT;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_navIconId_fkey" FOREIGN KEY ("navIconId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactLink" ADD CONSTRAINT "ContactLink_iconId_fkey" FOREIGN KEY ("iconId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
