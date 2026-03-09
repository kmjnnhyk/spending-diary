-- CreateEnum
CREATE TYPE "TransactionFlag" AS ENUM ('NONE', 'INTERNAL_TRANSFER', 'REFUND', 'CANCELLED', 'PAY_CHARGE');

-- AlterEnum
ALTER TYPE "CategoryStatus" ADD VALUE 'UNVERIFIED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "flag" "TransactionFlag" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "refundOfId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_refundOfId_fkey" FOREIGN KEY ("refundOfId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
