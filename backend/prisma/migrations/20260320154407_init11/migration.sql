-- AlterTable
ALTER TABLE "CustomerReceivable" ALTER COLUMN "payment_status" SET DEFAULT 'unsettled';

-- AlterTable
ALTER TABLE "CustomerSplitPayment" ALTER COLUMN "status" SET DEFAULT 'settled';
