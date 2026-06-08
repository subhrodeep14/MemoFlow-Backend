-- CreateTable
CREATE TABLE "register_settings" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "register_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "register_settings_year_key" ON "register_settings"("year");
