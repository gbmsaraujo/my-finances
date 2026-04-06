-- CreateEnum
CREATE TYPE "TransactionPaymentKind" AS ENUM ('SINGLE', 'FIXED', 'INSTALLMENT');

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "paymentKind" "TransactionPaymentKind" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN "installmentGroupId" TEXT,
ADD COLUMN "installmentNumber" INTEGER,
ADD COLUMN "installmentCount" INTEGER,
ADD COLUMN "installmentTotalAmount" DECIMAL(10,2),
ADD COLUMN "quoteValues" JSONB;

-- CreateIndex
CREATE INDEX "Transaction_installmentGroupId_idx" ON "Transaction"("installmentGroupId");
