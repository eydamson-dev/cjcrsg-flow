-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "facebook_pages" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "category" TEXT,
    "tasks" JSONB,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL,
    "facebookPageRecordId" TEXT,
    "facebookPageId" TEXT NOT NULL,
    "facebookPageName" TEXT NOT NULL,
    "caption" TEXT,
    "designId" TEXT,
    "mediaKey" TEXT,
    "mediaContentType" TEXT,
    "facebookPostId" TEXT,
    "facebookPhotoId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "errorCode" INTEGER,
    "errorSubcode" INTEGER,
    "errorMessage" TEXT,
    "fbtraceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facebook_pages_pageId_key" ON "facebook_pages"("pageId");

-- CreateIndex
CREATE INDEX "publications_contentId_createdAt_idx" ON "publications"("contentId", "createdAt");

-- CreateIndex
CREATE INDEX "publications_status_idx" ON "publications"("status");

-- CreateIndex
CREATE INDEX "publications_facebookPageRecordId_idx" ON "publications"("facebookPageRecordId");

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_facebookPageRecordId_fkey" FOREIGN KEY ("facebookPageRecordId") REFERENCES "facebook_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
