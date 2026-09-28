-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "canvaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailKey" TEXT,
    "thumbnailContentType" TEXT,
    "viewUrl" TEXT,
    "createUrl" TEXT,
    "canvaCreatedAt" TIMESTAMP(3),
    "canvaUpdatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_fields" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "template_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "templates_canvaId_key" ON "templates"("canvaId");

-- CreateIndex
CREATE UNIQUE INDEX "template_fields_templateId_name_key" ON "template_fields"("templateId", "name");

-- AddForeignKey
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
