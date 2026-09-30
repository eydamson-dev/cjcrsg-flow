-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('UNFINISHED', 'DRAFT', 'READY');

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'UNFINISHED',
    "templateId" TEXT,
    "templateCanvaId" TEXT NOT NULL,
    "templateTitle" TEXT NOT NULL,
    "templateFields" JSONB NOT NULL,
    "fieldValues" JSONB NOT NULL DEFAULT '{}',
    "designId" TEXT,
    "editUrl" TEXT,
    "viewUrl" TEXT,
    "thumbnailKey" TEXT,
    "thumbnailContentType" TEXT,
    "autofillJobId" TEXT,
    "autofillStatus" TEXT,
    "autofillError" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_assets" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,

    CONSTRAINT "content_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contents_templateId_idx" ON "contents"("templateId");

-- CreateIndex
CREATE INDEX "contents_status_updatedAt_idx" ON "contents"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "content_assets_contentId_fieldName_key" ON "content_assets"("contentId", "fieldName");

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
