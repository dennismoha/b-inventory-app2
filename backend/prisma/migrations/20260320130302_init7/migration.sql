-- CreateTable
CREATE TABLE "CustomerSplitPayment" (
    "customer_receivable_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "PayableStatus" NOT NULL DEFAULT 'unsettled',

    CONSTRAINT "CustomerSplitPayment_pkey" PRIMARY KEY ("customer_receivable_id")
);

-- AddForeignKey
ALTER TABLE "CustomerSplitPayment" ADD CONSTRAINT "CustomerSplitPayment_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transactionId") ON DELETE RESTRICT ON UPDATE CASCADE;
