/*
  Warnings:

  - A unique constraint covering the columns `[batch_inventory_id]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `batch_inventory_id` to the `Inventory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "batch_inventory_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_batch_inventory_id_key" ON "Inventory"("batch_inventory_id");
