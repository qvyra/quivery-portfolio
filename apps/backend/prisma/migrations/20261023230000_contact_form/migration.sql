-- CreateEnum
CREATE TYPE "ContactTopic" AS ENUM ('JOB_OPPORTUNITY', 'COMMISSION', 'GEODE_OR_LOUPE', 'OTHER');

-- AlterTable
ALTER TABLE "ContactMessage" DROP COLUMN "discord",
ADD COLUMN     "idempotencyKey" TEXT NOT NULL,
ADD COLUMN     "ipHash" TEXT NOT NULL,
ADD COLUMN     "topic" "ContactTopic";

-- CreateIndex
CREATE UNIQUE INDEX "ContactMessage_idempotencyKey_key" ON "ContactMessage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ContactMessage_ipHash_createdAt_idx" ON "ContactMessage"("ipHash", "createdAt");
