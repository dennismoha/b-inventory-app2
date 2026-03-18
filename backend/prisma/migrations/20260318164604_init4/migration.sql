/*
  Warnings:

  - You are about to drop the column `batch_inventory_id` on the `Inventory` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Inventory_batch_inventory_id_key";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "batch_inventory_id";
