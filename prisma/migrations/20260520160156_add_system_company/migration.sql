-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "name" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isSystemCompany" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminCode" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purposes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purposes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL,
    "slNo" INTEGER NOT NULL,
    "memoNumber" TEXT NOT NULL,
    "senderCompanyId" TEXT NOT NULL,
    "receiverCompanyId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "companies_adminCode_key" ON "companies"("adminCode");

-- CreateIndex
CREATE UNIQUE INDEX "companies_employeeCode_key" ON "companies"("employeeCode");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_code_idx" ON "companies"("code");

-- CreateIndex
CREATE INDEX "companies_adminCode_idx" ON "companies"("adminCode");

-- CreateIndex
CREATE INDEX "companies_employeeCode_idx" ON "companies"("employeeCode");

-- CreateIndex
CREATE INDEX "companies_isSystemCompany_idx" ON "companies"("isSystemCompany");

-- CreateIndex
CREATE UNIQUE INDEX "purposes_name_key" ON "purposes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "purposes_code_key" ON "purposes"("code");

-- CreateIndex
CREATE INDEX "purposes_name_idx" ON "purposes"("name");

-- CreateIndex
CREATE INDEX "purposes_code_idx" ON "purposes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "entries_slNo_key" ON "entries"("slNo");

-- CreateIndex
CREATE UNIQUE INDEX "entries_memoNumber_key" ON "entries"("memoNumber");

-- CreateIndex
CREATE INDEX "entries_slNo_idx" ON "entries"("slNo");

-- CreateIndex
CREATE INDEX "entries_date_idx" ON "entries"("date");

-- CreateIndex
CREATE INDEX "entries_memoNumber_idx" ON "entries"("memoNumber");

-- CreateIndex
CREATE INDEX "entries_senderCompanyId_idx" ON "entries"("senderCompanyId");

-- CreateIndex
CREATE INDEX "entries_receiverCompanyId_idx" ON "entries"("receiverCompanyId");

-- CreateIndex
CREATE INDEX "entries_purposeId_idx" ON "entries"("purposeId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "purposes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_receiverCompanyId_fkey" FOREIGN KEY ("receiverCompanyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_senderCompanyId_fkey" FOREIGN KEY ("senderCompanyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
