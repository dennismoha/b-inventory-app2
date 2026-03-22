import express, { Router } from 'express';
import { TransactionsController } from '@src/features/transactions/controller/';
import { verifyAuthRoles } from '@src/shared/globals/helpers/verify-roles';
import { authMiddleware } from '@src/shared/globals/helpers/auth-middleware';

class TransactionRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    // this.router.get('/transactions/:transactionId', TransactionsController.prototype.fetchTransactions);
    // this.router.get('/transactions/customer/:customerId', TransactionsController.prototype.fetchTransactionsByCustomer);
    this.router.post('/transactions', authMiddleware.verifyUser, verifyAuthRoles('admin', 'user'), TransactionsController.prototype.createTransaction);
    // this.router.put('/transactions/:transactionId', TransactionsController.prototype.updateTransaction);
    // this.router.delete('/transactions/:transactionId', TransactionsController.prototype.deleteTransaction);
    this.router.get('/transactions',authMiddleware.verifyUser, verifyAuthRoles('admin'), TransactionsController.prototype.fetchTransactions);
    this.router.get('/transactions/customer/receivables', authMiddleware.verifyUser, verifyAuthRoles('admin'), TransactionsController.prototype.getCustomerReceivables);
    this.router.post('/transactions/customer-receivables/settle', authMiddleware.verifyUser, verifyAuthRoles('admin'), TransactionsController.prototype.handleCustomerReceivablePayment);

    return this.router;
  }
}

export const transactionRoutes = new TransactionRoutes();
