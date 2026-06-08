/*
  Warnings:

  - A unique constraint covering the columns `[year,slNo,senderCompanyId]` on the table `entries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "entries_year_slNo_key";

-- CreateIndex
CREATE UNIQUE INDEX "entries_year_slNo_senderCompanyId_key" ON "entries"("year", "slNo", "senderCompanyId");
