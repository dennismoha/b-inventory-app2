/*
  Warnings:

  - You are about to drop the column `batch_inventory_id` on the `Inventory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_batch_inventory_id_fkey";

-- DropIndex
DROP INDEX "Inventory_batch_inventory_id_key";

-- DropIndex
DROP INDEX "Inventory_batch_inventory_id_status_key";

-- AlterTable
ALTER TABLE "Inventory" DROP COLUMN "batch_inventory_id";
