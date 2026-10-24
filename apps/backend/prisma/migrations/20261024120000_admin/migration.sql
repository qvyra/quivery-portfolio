-- AlterTable
ALTER TABLE "ContactLink" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "captionsId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "Stat" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "draft" JSONB;

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_userId_idx" ON "AdminSession"("userId");

-- CreateIndex
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_captionsId_fkey" FOREIGN KEY ("captionsId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
