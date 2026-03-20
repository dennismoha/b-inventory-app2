/*
  Warnings:

  - You are about to drop the column `payment_method` on the `CustomerSplitPayment` table. All the data in the column will be lost.
  - Added the required column `paymentType` to the `CustomerSplitPayment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CustomerSplitPayment" DROP COLUMN "payment_method",
ADD COLUMN     "paymentType" "PaymentMethod" NOT NULL;
