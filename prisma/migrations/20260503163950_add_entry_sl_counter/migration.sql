-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "memoNumber" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderCode" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverCode" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "fileUrl" TEXT,
    "filePath" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sl_counters" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sl_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entries_slNo_key" ON "entries"("slNo");

-- CreateIndex
CREATE UNIQUE INDEX "entries_memoNumber_key" ON "entries"("memoNumber");

-- CreateIndex
CREATE INDEX "entries_date_idx" ON "entries"("date");

-- CreateIndex
CREATE INDEX "entries_senderCode_idx" ON "entries"("senderCode");

-- CreateIndex
CREATE INDEX "entries_receiverCode_idx" ON "entries"("receiverCode");

-- CreateIndex
CREATE INDEX "entries_slNo_idx" ON "entries"("slNo");

-- CreateIndex
CREATE UNIQUE INDEX "sl_counters_value_key" ON "sl_counters"("value");
