/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { transactionSchema } from '@src/features/transactions/schema/transactions-schema';
import { joiValidation } from '@src/shared/globals/decorators/joi-validation-decorators';
import { StatusCodes } from 'http-status-codes';
import { utilMessage } from '@src/shared/globals/helpers/utils';
import GetSuccessMessage from '@src/shared/globals/helpers/success-messages';
// import prisma, { PrismaTransactionalClient } from '@src/shared/prisma/prisma-client'; // Prisma client to interact with the database
import prisma, { PrismaTransactionalClient } from '@src/shared/prisma/prisma-client'; // Prisma client to interact with the database
import {
  PayableStatus,
  Transaction,
  TransactionPayments,
  // TransactionProduct,
  TransactionProductItems
} from '@src/features/transactions/interfaces/transaction.interface';
// import { Decimal } from '@prisma/client/runtime/library';

import crypto from 'crypto';
import { BadRequestError } from '@src/shared/globals/helpers/error-handler';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountController } from '@src/features/accounting/controller/accounts-controller';
import { Account_Bank, Account_Inventory, Account_Receivable } from '@src/constants';
import { JournalService } from '@src/features/accounting/controller/journals-controller';
import { SettlementStatus } from '@src/shared/globals/enums/ts.enums';

/**
 * when and showing them to user have a productsummary remaining total for each product and inventory_quantity for each.
 *
 * Now, if  quantity picked by user >  inventory stock but < productSummary reminaing total then we will have to load a new batch to inventiry
 *  .... etc,,, etc
 * if greater than all then it means that what is ordered  > than our stock.
 * if < inventory_stock then no need for loading another batch
 *
 *
 */

function money(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100; // round to 2dp to avoid floating noise
}

export class TransactionsController {
  /**
   * Fetch all transactions.
   */
  public async fetchTransactions(req: Request, res: Response): Promise<void> {
    const transactions: Transaction[] = await prisma.transaction.findMany({
      include: {
        customer: true, // If customer is provided,
        Sales: true
      }
    });
    const message = utilMessage.fetchedMessage('transactions');
    res.status(StatusCodes.OK).send(GetSuccessMessage(StatusCodes.OK, transactions, message));
  }

  /**
   * Create a new transaction.
   */

  @joiValidation(transactionSchema)
  public async createTransaction(req: Request, res: Response): Promise<void> {
    const { cartProducts, customerId, paymentMethod, totalCost, payments }: TransactionProductItems = req.body;

    // POS session check
    const posSession = req.headers['pos_session'];
    if (!posSession || typeof posSession !== 'string') {
      throw new BadRequestError('No active POS session');
    }

    // Resolve opening/closing balance
    const ocb = await prisma.openingClosingBalance.findFirst({
      where: { pos_session_id: posSession },
      select: { cash_bank_ledger_id: true, id: true }
    });
    if (!ocb) {
      throw new BadRequestError('POS session not linked to opening/closing balance');
    }

    // ────────────────────────────
    // DB Transaction
    // ────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const transactionId = crypto.randomUUID();

      // check if stock is zero in the invetory. guard rail against frontend validation bypass

      const checkIfStockIsZero = await tx.inventory.findMany({
        where: {
          supplier_products_id: {
            in: cartProducts.map((p) => p.supplier_products_id)
          }
        }
      });

      if (checkIfStockIsZero.some((item) => Number(item.stock_quantity) === 0)) {
        throw new BadRequestError('One or more items in the cart are out of stock');
      }

      const transaction = await tx.transaction.create({
        data: {
          transactionId,
          customerId: customerId ?? null,
          totalCost: money(totalCost.total),
          subtotal: money(totalCost.subtotal),
          paymentMethod: 'CASH'
        }
      });

      const txProductsData: Array<{
        inventoryId: string;
        supplier_products_id: string;
        quantity: number;
        stock_quantity: number | Decimal;
        BatchInventoryId: string;
        productName: string;
        price: number;
        VAT: number;
        discount: number;
        productSubTotalCost: number;
        productTotalCost: number;
        transactionId: string;
      }> = [];

      for (const item of cartProducts) {
        let totalAllocated = 0;
        console.log('each items is ', item);

        // No batch allocation needed (pull directly from inventory)
        totalAllocated = item.quantity;

        const productSubTotalCost = money(item.price * item.quantity);
        const productTotalCost = money(item.price * item.quantity * (1 + item.VAT / 100) - item.discount);

        txProductsData.push({
          inventoryId: item.inventoryId,
          supplier_products_id: item.supplier_products_id,
          // BatchInventoryId: item.batch_inventory_id, // not batch-allocated
          BatchInventoryId: '', // not batch-allocated
          stock_quantity: item.stock_quantity,
          quantity: item.quantity,
          productName: item.productName,
          price: item.price,
          VAT: Number(item.VAT),
          discount: Number(item.discount),
          productSubTotalCost,
          productTotalCost,
          transactionId
        });

        const inventoryUpdates = await tx.inventory.findUnique({
          where: {
            supplier_products_id: item.supplier_products_id
            //  status: 'ACTIVE',
            //   batch_inventory_id: item.batch_inventory_id
          }
        });

        if (!inventoryUpdates) {
          throw new BadRequestError('item not found in inventory');
        }

        console.log('inventory updaes', inventoryUpdates.stock_quantity);
        console.log('item stock', item.stock_quantity);
        console.log('item quantity', item.quantity);
        console.log('total allocated ', totalAllocated);

        await tx.productSummary.update({
          where: { supplier_products_id: item.supplier_products_id },
          data: {
            total_sold: { increment: totalAllocated }
          }
        });


        await tx.inventory.update({
          where: { supplier_products_id: item.supplier_products_id },
          data: { stock_quantity: { decrement: totalAllocated } }
        });
      }

      // Insert all product lines
      if (txProductsData.length > 0) {
        await tx.sales.createMany({ data: txProductsData });
      }

      // Handle payments
      if (paymentMethod === 'CASH') {
        console.log('WE ARE IN THE CASH ACCOUNT ');
        const inventoryAccount = await AccountController.findAccount({
          tx,
          name: Account_Inventory.name,
          type: Account_Inventory.acc_type
        });
        const BankAccount = await AccountController.findAccount({ tx, name: Account_Bank.name, type: Account_Bank.acc_type });
        if (!inventoryAccount && !BankAccount) {
          throw new BadRequestError('Account not configured');
        }
        console.log('inventory account is ', inventoryAccount);

        const journalEntry = await JournalService.createJournalEntry(tx, {
          transactionId: 'purchase_payment',
          description: 'purchase payment',
          lines: [
            {
              account_id: inventoryAccount.account_id!,
              credit: new Decimal(totalCost.total)
            },
            {
              account_id: BankAccount.account_id,
              debit: new Decimal(totalCost.total)
            }
          ]
        });

        console.log('journal entry is ', journalEntry);
      } else if (paymentMethod === 'CREDIT') {
        if (!customerId) {
          throw new BadRequestError('Credit sales require a customer');
        }

        await tx.customerReceivable.create({
          data: {
            customer_id: customerId,
            total_Amount: money(totalCost.total),
            transaction_id: transactionId,
            balance_due: money(totalCost.total)
          }
        });
      } else if (paymentMethod === 'SPLIT') {
        /**
         * this is where logic for split payment will be handled. we will need to receive from the frontend how much of the total is being paid by each method, then we can create journal entries for each payment method accordingly. for example, if part is paid by cash and part by credit, we would create a journal entry that debits cash and accounts receivable, and credits sales revenue. we would also need to update the customer receivable record if there is a credit portion. this requires more complex handling on both the frontend and backend to ensure all payment details are captured correctly.
         */
        console.log('we are in split payment method');

        if (!payments || payments.length === 0) {
          throw new BadRequestError('Split payment requires payment details');
        }
        const data = await TransactionsController.handleSplitPayment(tx, customerId!, payments, transactionId, totalCost.total);
        console.log('split payment data is ', data);
      }

      return { transaction, products: txProductsData };
    });

    const message = utilMessage.created('transaction');
    res.json({ message, result });
    // res
    //   .status(StatusCodes.CREATED)
    //   .send(GetSuccessMessage(StatusCodes.CREATED, result, message));
  }



  /**
   * 
   * @param req 
   * @param res 
   * 
   * returns a list of customer receivables with their associated transactions and sales details. The response is structured to provide a clear view of each receivable, the customer information, the transaction date, and the breakdown of products sold under that transaction. This allows the frontend to easily display receivables along with all relevant details for each customer.
   * 
   */

  public async getCustomerReceivables(req: Request, res: Response): Promise<void> {
    // const customerId = req.params.customerId;

    const receivables = await prisma.customerReceivable.findMany({
      where: { payment_status: 'unsettled' },
      select: {
        customer_receivable_id: true,
        customer_id: true,
        total_Amount: true,
        total_paid: true,
        balance_due: true,
        transaction_id: true, // created_at: true
        customer: {
          select: {
            firstName: true,
            lastName: true,
            totalSpent: true,
            loyaltyPoints: true,
            preferredPaymentMethod: true
          }
        },
        Transactions: {
          select: {
            transactionDateCreated: true,
            transactionId: true,

            Sales: {
              select: {
                productName: true,
                quantity: true,
                price: true,
                discount: true,
                VAT: true,
                productSubTotalCost: true,
                productTotalCost: true
              }
            }
          }
        }
      }

      // orderBy: { created_at: 'desc' }
    });

    /**
     * we destructure receivables from the data. receivables is an array .
     * now each is an object with customer receivable details and an array of transactions. each transaction has an array of sales which has the product details.
     *  now loop through each receivable, linking each with customer, then go to the transaction and loop through the sales to get the product details. we can then calculate totals for each receivable and return a structured response to the frontend.
     *
     */
    const transformReceivables = (data: any) => {
      console.log('data is ', data);
      return data.map(
        (rec: {
          Transactions: { Sales: any[]; transactionDateCreated: any };
          total_paid: any;
          customer_receivable_id: any;
          transaction_id: any;
          customer_id: any;
          customer: { firstName: any; lastName: any; preferredPaymentMethod: any };
        }) => {
          const sales = rec.Transactions.Sales.map(
            (sale: { quantity: number; price: number; discount: number; VAT: number; productName: any }) => {
              const subTotal = sale.quantity * sale.price;
              const discount = sale.discount || 0;
              const vat = sale.VAT || 0;

              const total = subTotal - discount + vat;

              return {
                productName: sale.productName,
                quantity: sale.quantity,
                price: sale.price,
                subTotal,
                discount,
                vat,
                total
              };
            }
          );

          //  Recalculate totals (never trust DB blindly)
          const totalAmount = sales.reduce((sum: any, s: { total: any }) => sum + s.total, 0);
          const totalPaid = Number(rec.total_paid || 0);
          const balanceDue = totalAmount - totalPaid;

          return {
            receivableId: rec.customer_receivable_id,
            transactionId: rec.transaction_id,
            transactionDate: rec.Transactions.transactionDateCreated,

            customer: {
              id: rec.customer_id,
              name: `${rec.customer.firstName} ${rec.customer.lastName}`,
              preferredPaymentMethod: rec.customer.preferredPaymentMethod
            },

            totals: {
              totalAmount,
              totalPaid,
              balanceDue
            },

            sales
          };
        }
      );
    };

    const data = await transformReceivables(receivables);

    const message = utilMessage.fetchedMessage('customer receivables');
    res.json({ message, data });
  }



  /**
   * 
   * @param req 
   * @param res 
   * 
   * This handles the payments of receivables
   * TransactionId for that particular transaction and the amount of payment made.  We first check if the receivable exists and is unsettled. Then we validate that the payment amount does not exceed the balance due. We calculate the new total paid and balance due, and determine if the receivable should now be marked as settled. Finally, we update the customer receivable record in the database with the new payment information and return a success message.
   */
  public async handleCustomerReceivablePayment(req: Request, res: Response): Promise<void> {
    const { transactionId, paymentAmount } = req.body;

    const receivable = await prisma.customerReceivable.findUnique({
      where: { transaction_id: transactionId }
    });

    if (!receivable) {
      throw new BadRequestError('Customer receivable not found');
    }

    if (receivable.payment_status === 'settled') {
      throw new BadRequestError('This receivable is already settled');
    }

    console.log('receivable is ', receivable);

    if (paymentAmount > Number(receivable.balance_due)) {
      throw new BadRequestError('Payment amount exceeds balance due');
    }

    const newTotalPaid = money(Number(receivable.total_paid) + paymentAmount);
    const newBalanceDue = money(Number(receivable.balance_due) - paymentAmount);

    let newPaymentStatus: PayableStatus = 'unsettled';
    if (newBalanceDue <= 0) {
      newPaymentStatus = 'settled';
    }

    const results = await prisma.$transaction(async (tx) => {
      // Update the customer receivable
      const updatedReceivable = await tx.customerReceivable.update({
        where: { transaction_id: transactionId },
        data: {
          total_paid: newTotalPaid,
          balance_due: newBalanceDue,
          payment_status: newPaymentStatus
        }
      });


      console.log('WE ARE IN THE   ACCOUNTing section ');
      const ReceivableAccount = await AccountController.findAccount({
        tx,
        name: Account_Receivable.name,
        type: Account_Receivable.acc_type
      });
      const BankAccount = await AccountController.findAccount({ tx, name: Account_Bank.name, type: Account_Bank.acc_type });
      if (!ReceivableAccount && !BankAccount) {
        throw new BadRequestError('Account not configured');
      }
      console.log('inventory account is ', ReceivableAccount);
     

      await JournalService.createJournalEntry(tx, {
        transactionId: transactionId,
        description: 'split transaction payment',
        lines: [
          {
            account_id: ReceivableAccount.account_id!,
            credit: new Decimal(newTotalPaid)
          },
          {
            account_id: BankAccount.account_id,
            debit: new Decimal(newTotalPaid)
          }
        ]
      });


      return updatedReceivable;
    });



    // const message = utilMessage.updated('customer receivable');
    // res.json({ message, updatedReceivable });

    res.json({ message: 'receivable payment processed successfully', results });
  }

  public async getTransactionsReport(req: Request, res: Response): Promise<void> {
    const { startDate, endDate } = req.query;

    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDateCreated: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      },
      include: {
        Sales: true,
        customer: true
      },
      orderBy: { transactionDateCreated: 'desc' }
    });

    const message = utilMessage.fetchedMessage('transactions report');
    res.json({ message, transactions });
  }

  // split payments
  /**
   * @param req 
   * @param res
   * so a customer can pay either through the following options:
   *  1) mpesa + cash
   *  2) mpesa + card
   *  3) cash + card
   *  4) mpesa + cash + card
   * 5) cash + credit
   * 6) cash + credit + mpesa
   * 7) card + credit
   * 8) card + credit + mpesa
   * 9) mpesa + credit
   * 10) mpesa + card + credit
   * 11) credit + mpesa + cash + card
   * 12) credit + cash + card
   * 13) credit + mpesa
   * 
   *
   *  so the request body will contain the transactionId, and an array of payments with amount and method. we will first validate that the transaction exists and is unsettled. then we will validate that the sum of payment amounts matches the balance due. then we will process each payment method accordingly (for example, if mpesa is involved, we might need to integrate with mpesa API to confirm payment). finally, we will update the customer receivable record in the database to reflect the payments and return a success message.
   */

  static async handleSplitPayment(tx: PrismaTransactionalClient, customerId: string, payments: TransactionPayments[], transactionId: string, totalCost: number): Promise<number> {

    const paymentData = payments.map((p) => ({
      transaction_id: transactionId,
      paymentType: p.paymentType,
      amount_paid: new Decimal(p.amount),
      reference: p.reference ?? null,
      status: p.paymentType === 'CREDIT' ? SettlementStatus.UNSETTLED : SettlementStatus.SETTLED

    }));
    await tx.customerSplitPayment.createMany({ data: paymentData });

    const isCreditTransaction = payments.some(p => p.paymentType === 'CREDIT');

    if (isCreditTransaction) {
      await tx.customerReceivable.create({
        data: {
          customer_id: customerId,
          total_Amount: money(totalCost),
          total_paid: new Decimal(payments.reduce((sum, p) => sum + (p.paymentType === 'CREDIT' ? 0 : p.amount), 0)),
          transaction_id: transactionId,
          balance_due: new Decimal(totalCost - payments.reduce((sum, p) => sum + (p.paymentType === 'CREDIT' ? 0 : p.amount), 0))
        }
      });

    }

    console.log('WE ARE IN THE   ACCOUNTing section ');
    const inventoryAccount = await AccountController.findAccount({
      tx,
      name: Account_Inventory.name,
      type: Account_Inventory.acc_type
    });
    const BankAccount = await AccountController.findAccount({ tx, name: Account_Bank.name, type: Account_Bank.acc_type });
    if (!inventoryAccount && !BankAccount) {
      throw new BadRequestError('Account not configured');
    }
    console.log('inventory account is ', inventoryAccount);
    const cashAmount = new Decimal(payments.reduce((sum, p) => sum + (p.paymentType === 'CREDIT' ? 0 : p.amount), 0));

    await JournalService.createJournalEntry(tx, {
      transactionId: transactionId,
      description: 'split transaction payment',
      lines: [
        {
          account_id: inventoryAccount.account_id!,
          credit: new Decimal(cashAmount)
        },
        {
          account_id: BankAccount.account_id,
          debit: new Decimal(cashAmount)
        }
      ]
    });

    return totalCost;


  }

}
