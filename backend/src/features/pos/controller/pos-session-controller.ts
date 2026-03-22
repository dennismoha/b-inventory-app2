

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import prisma from '@src/shared/prisma/prisma-client';
import { ConflictError, NotFoundError } from '@src/shared/globals/helpers/error-handler';
import { v4 as uuidv4 } from 'uuid';
import GetSuccessMessage from '@src/shared/globals/helpers/success-messages';
import { pos_session_header } from '../interface/pos.interface';

export class PosSessionController {

  public async openSession(req: Request, res: Response): Promise<Response> {
    const posId = 'posid';
    const openedBy = req.currentUser!.email;

    // Step 1: Check if the user already has an active session
    const activeSession = await prisma.posSession.findFirst({
      where: { openedBy, status: 'OPEN' }
    });

    if (activeSession) {
      throw new ConflictError('You already have an active POS session.');
    }

    // Step 2: Get the last CLOSED session's closing balance & account_collection_id
    const lastClosedBalance = await prisma.openingClosingBalance.findFirst({
      where: { status: 'CLOSED' },
      orderBy: { closing_date: 'desc' }
    });

    const openingBalance = lastClosedBalance?.closing_balance || 0;
    const prevAccountCollectionId = lastClosedBalance?.account_collection_id || null;

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Step 3: Create the new POS session (set status to OPEN)
      const newPosSession = await tx.posSession.create({
        data: {
          posId,
          openedBy,
          status: 'OPEN'
        }
      });

      // Step 4: Generate the master cash_bank_ledger_id
      const cashBankLedgerId = uuidv4();

      // Step 5: Create the OpeningClosingBalance record
      await tx.openingClosingBalance.create({
        data: {
          pos_session_id: newPosSession.pos_session_id,
          cash_bank_ledger_id: cashBankLedgerId,
          opening_balance: openingBalance,
          status: 'PREV',
          account_collection_id: prevAccountCollectionId
        }
      });

      // Step 6: Create the initial CashBookLedger record (if needed)
      // Skipped for now

      // Step 7 & 8: Update active accounts and log them
      const activeAccounts = await tx.account.findMany({
        where: {
          deleted: false,
          account_status: 'ACTIVE'
        }
      });

      for (const account of activeAccounts) {
        const opening = account.opening_balance;

        if (account.running_balance !== opening) {
          await tx.account.update({
            where: { account_id: account.account_id },
            data: { running_balance: opening }
          });
        }

        await tx.accountSessionLog.create({
          data: {
            account_id: account.account_id,
            opening_balance: opening,
            closing_balance: opening,
            pos_session: newPosSession.pos_session_id,
            user: openedBy
          }
        });
      }

      return newPosSession;
    });

    // Step 9: Attach POS session to currentUser & return response
    req.currentUser!.posSessionId = result.pos_session_id;

    return res.status(StatusCodes.CREATED).json({
      message: 'POS session opened successfully',
      data: {
        session: result
      }
    });
  }

  /**
   * Close an active POS session
   */
  public async closeSession(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.currentUser!;
      console.log('Current User>>>>>>>>>>>>:', currentUser?.posSessionId, '  /n req ', req.currentUser);
      console.log('req pos led ', req.posLedgerId);
      if (!req.posLedgerId) {
        res.status(400).json({ message: 'No active session to close.' });
        return;
      }

      const sessionId = req.possession;

      // 1. Create AccountCollection record
      const accountCollection = await prisma.accountCollection.create({
        data: {
          collection_id: uuidv4(),
          snapshot_date: new Date()
        }
      });

      // 2. Get all accounts and save snapshots
      const accounts = await prisma.account.findMany({
        where: { deleted: false }
      });

      const snapshots = accounts.map((acc) => ({
        snapshot_id: uuidv4(),
        account_id: acc.account_id,
        balance: acc.running_balance,
        collection_id: accountCollection.collection_id
      }));

      await prisma.accountBalanceSnapshot.createMany({
        data: snapshots
      });

      // 3. Calculate total closing balance
      const totalClosingBalance = accounts.reduce((sum, acc) => {
        return sum + Number(acc.running_balance);
      }, 0);

      // 4. Update OpeningClosingBalance
      await prisma.openingClosingBalance.updateMany({
        where: {
          pos_session_id: sessionId,
          closing_date: null
        },
        data: {
          closing_date: new Date(),
          closing_balance: totalClosingBalance,
          total_for_accounts: totalClosingBalance,
          account_collection_id: accountCollection.collection_id,
          status: 'CLOSED'
        }
      });

      // 5. Update PosSession
      await prisma.posSession.update({
        where: { pos_session_id: sessionId },
        data: {
          closedBy: currentUser.email,
          closedAt: new Date(),
          status: 'CLOSED'
        }
      });

      // 6. Remove session from current user context
      currentUser.posSessionId = undefined;

      // 7. Return updated session
      res.status(200).json({
        message: 'POS session closed successfully.',
        sessionId: sessionId,
        closedBy: currentUser.email,
        closingBalance: totalClosingBalance
      });
    } catch (error) {
      console.error('Error closing POS session:', error);
      res.status(500).json({ message: 'Failed to close POS session.' });
    }
  }

  /**
   * Checks if the current user has an active POS session.
   * This is meant to be used as middleware in protected routes.
   */
  public async checkPosSession(req: Request, res: Response): Promise<Response | void> {
    // const posSessionId = req.headers['pos-session-id'] as string;

    const posSessionId: pos_session_header | null = await prisma.posSession.findFirst({
      where: {
        status: 'OPEN'
      },
      select: {
        pos_session_id: true
      }
    });

    if (!posSessionId) {
      throw new NotFoundError('No active POS session found for the user.');
    }

    console.log('Active POS session found:', posSessionId);
    res.status(StatusCodes.OK).send(GetSuccessMessage(StatusCodes.OK, posSessionId, 'pos session found'));  
  }
}
