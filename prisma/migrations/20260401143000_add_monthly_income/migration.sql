-- CreateTable
CREATE TABLE "MonthlyIncomeProfile" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultAmount" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyIncomeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyIncomeEntry" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyIncomeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyIncomeProfile_householdId_userId_key" ON "MonthlyIncomeProfile"("householdId", "userId");

-- CreateIndex
CREATE INDEX "MonthlyIncomeProfile_userId_idx" ON "MonthlyIncomeProfile"("userId");

-- CreateIndex
CREATE INDEX "MonthlyIncomeProfile_householdId_idx" ON "MonthlyIncomeProfile"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyIncomeEntry_householdId_userId_month_year_key" ON "MonthlyIncomeEntry"("householdId", "userId", "month", "year");

-- CreateIndex
CREATE INDEX "MonthlyIncomeEntry_householdId_month_year_idx" ON "MonthlyIncomeEntry"("householdId", "month", "year");

-- CreateIndex
CREATE INDEX "MonthlyIncomeEntry_userId_idx" ON "MonthlyIncomeEntry"("userId");

-- AddForeignKey
ALTER TABLE "MonthlyIncomeProfile" ADD CONSTRAINT "MonthlyIncomeProfile_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyIncomeProfile" ADD CONSTRAINT "MonthlyIncomeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyIncomeEntry" ADD CONSTRAINT "MonthlyIncomeEntry_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyIncomeEntry" ADD CONSTRAINT "MonthlyIncomeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
