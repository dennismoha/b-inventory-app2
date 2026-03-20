// import { Decimal } from '@prisma/client/runtime/library';

import { Customer } from '@src/features/customers/interfaces/customer.interface';
import { Inventory } from '@src/features/inventory/interfaces/inventory.interface';
import { SupplierProduct } from '@src/features/suppliers/interfaces/supplier.interface';


// this is the structure of the transaction how it looks with the totala amounts, pyaments methods etc.
export interface Transaction {
  transactionId: string; // Transaction ID
  totalCost: number; // Total cost after applying discounts and VAT
  paymentMethod: string; // Payment method (e.g., card, PayPal, cash)
  subtotal: number; // Subtotal (price * quantity). total before taxes and others are added

  // Relationships
  customer?: Customer | null;

  TransactionProduct?: TransactionProduct[];
  // List of related transaction products
}

// This is the structure of the data of all items in a transaction
export type TransactionProduct = Pick<Inventory, 'inventoryId' | 'stock_quantity' | 'supplier_products_id'> & {
  quantity: number;
  productName: string;
  price: number;
  VAT: number;
  discount: number;
  transactionId: string;
  productSubTotalCost?: number;
  productTotalCost?: number;
  batch_inventory_id: string;
  needsBatchLoad: boolean;
  SupplierProduct?: SupplierProduct;
  total_stock_quantity: number; // this will come from the productSummaryStock.
};

// this is the structure of the data from the frontend

export interface TransactionProductItems {
  cartProducts: TransactionProduct[];
  statusTab: boolean;
  totalCost: {
    total: number;
    subtotal: number;
  };
  paymentMethod: 'CASH' | 'BANK' | 'CREDIT' | 'SPLIT' | 'MPESA';
  customerId?: string;
  payments?:TransactionPayments[];
}

export interface TransactionPayments  {
  paymentType: 'CASH' | 'BANK' | 'CREDIT' | 'MPESA';
    amount: number;
    reference?: string; // for mpesa payments
}

export type PayableStatus = 'settled' | 'unsettled';
