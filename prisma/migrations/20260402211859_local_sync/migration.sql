-- CreateEnum
CREATE TYPE "ValidationCodeType" AS ENUM ('SIGNUP', 'FORGOT_PASSWORD', 'INVITE');

-- CreateTable
CREATE TABLE "ValidationCode" (
    "id" TEXT NOT NULL,
    "type" "ValidationCodeType" NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT,
    "householdId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValidationCode_email_type_idx" ON "ValidationCode"("email", "type");

-- CreateIndex
CREATE INDEX "ValidationCode_userId_idx" ON "ValidationCode"("userId");

-- CreateIndex
CREATE INDEX "ValidationCode_householdId_idx" ON "ValidationCode"("householdId");

-- CreateIndex
CREATE INDEX "ValidationCode_expiresAt_idx" ON "ValidationCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationCode_type_code_key" ON "ValidationCode"("type", "code");

-- AddForeignKey
ALTER TABLE "ValidationCode" ADD CONSTRAINT "ValidationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCode" ADD CONSTRAINT "ValidationCode_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
