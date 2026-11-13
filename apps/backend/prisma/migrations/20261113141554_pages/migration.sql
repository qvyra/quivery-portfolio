-- Standalone pages at /<slug>, and a section's optional button to one
-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "linkLabel" TEXT,
ADD COLUMN     "linkPage" TEXT;

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleHighlight" TEXT,
    "eyebrow" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT NOT NULL,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "draft" JSONB,
    "publishStatus" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_publishStatus_visible_sortOrder_idx" ON "Page"("publishStatus", "visible", "sortOrder");
