/*
  Warnings:

  - A unique constraint covering the columns `[year,slNo]` on the table `entries` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[year,memoNumber]` on the table `entries` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "entries_memoNumber_key";

-- DropIndex
DROP INDEX "entries_slNo_key";

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 2026;

-- CreateIndex
CREATE UNIQUE INDEX "entries_year_slNo_key" ON "entries"("year", "slNo");

-- CreateIndex
CREATE UNIQUE INDEX "entries_year_memoNumber_key" ON "entries"("year", "memoNumber");
