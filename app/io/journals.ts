import { readDirAsList, updateFile } from '~/utils/fs';
import * as C from '~/utils/common';
import {
  groupByDate,
  parseJournal,
  standardizePostings,
  Transaction,
  transactionSorterByDate,
  transactionSorterByObject,
  transactionToPlainText,
} from '~/utils/ledger';
import { readAccountDataMap } from '~/io/accounts';
import { readCsvTransactions } from '~/io/csvs';

export const readTransactions = async () => {
  const journals = await readDirAsList(process.env.DATA_DIR!, (text, name) =>
    name.endsWith('.ledger') && name !== 'main.ledger'
      ? parseJournal(text)
      : null
  );

  return journals.flat().sort(transactionSorterByDate) as Transaction[];
};

//

export const readInferredTransactions = async () => {
  const accountDataMap = await readAccountDataMap();

  return (await readCsvTransactions())
    .map(({ desc, accountNo, date, currency, amount, id }): Transaction => {
      // Match account and match fn results from description
      const [objectAccount, match] = Object.entries(accountDataMap).reduce(
        (acc, [account, data]) => {
          const output = data.match({ string: desc });
          return output ? [account, output] : acc;
        },
        [] as any[]
      );

      // Match account from account number
      const subjectAccount = Object.entries(accountDataMap).reduce(
        (acc, [account, data]) =>
          accountNo === data.accountNo ? account : acc,
        ''
      );

      if (!subjectAccount) {
        throw new Error(
          'No asset account found for account number: ' + accountNo
        );
      }

      const [postings, subjectsAmount] = standardizePostings([
        {
          account: objectAccount ?? 'Expenses:Unknown',
          currency,
        },
        {
          account: subjectAccount,
          amount,
          currency,
        },
      ]);

      return {
        id,
        date,
        postings,
        amount: subjectsAmount,
        prefix: objectAccount ? '*' : '@',
        payee: objectAccount ? match.name : desc,
      };
    })
    .sort(transactionSorterByDate) as Transaction[];
};

export const writeTransaction = async (t: Transaction) => {
  const [year, month] = t.date.split('-');

  return updateFile(
    `${process.env.DATA_DIR!}/${year}/${month}.ledger`,
    (file) => {
      const transactions = file ? parseJournal(file) : [];

      if (t.index !== undefined) transactions[t.index] = t;
      else transactions.push(t);

      return transactions
        .sort(transactionSorterByObject)
        .sort(transactionSorterByDate)
        .map(transactionToPlainText)
        .join('\n\n');
    }
  );
};

//

export enum TransactionStatus {
  INFERRED = 'INFERRED',
  AUTO_MATCHED = 'AUTO_MATCHED',
  CONNECTED = 'CONNECTED',
  UNCONNECTED = 'UNCONNECTED',
}

export interface TransactionAggregation {
  status: TransactionStatus;
  amount: number;
  date: string;
  id?: number;
  inferred?: Transaction;
  declared?: Transaction;
}

export const readAggregatedTransactions = async () => {
  const transactions = await readTransactions();
  const inferredTransactions = await readInferredTransactions();

  const unconnected = transactions.map((declared) => ({
    declared,
    status: TransactionStatus.UNCONNECTED,
    date: declared.date,
    amount: declared.amount,
  })) as TransactionAggregation[];

  return inferredTransactions
    .reduce(
      (acc, inferred) => {
        const connectionIndex = transactions.findIndex(
          (t) => t.id === inferred.id
        );

        const matchIndex = transactions.findIndex(
          (t, i) =>
            acc[i].status === TransactionStatus.UNCONNECTED &&
            t.date === inferred.date &&
            t.amount === inferred.amount &&
            (t.payee.toLowerCase().includes(inferred.payee.toLowerCase()) ||
              inferred.payee.toLowerCase().includes(t.payee.toLowerCase()))
        );

        if (connectionIndex !== -1) {
          acc[connectionIndex] = {
            ...acc[connectionIndex],
            id: inferred.id,
            status: TransactionStatus.CONNECTED,
            inferred,
          };

          return acc;
        } else if (matchIndex !== -1) {
          acc[matchIndex] = {
            ...acc[matchIndex],
            status: TransactionStatus.AUTO_MATCHED,
            id: inferred.id,
            inferred,
          };

          return acc;
        }

        acc.push({
          status: TransactionStatus.INFERRED,
          date: inferred.date,
          amount: inferred.amount,
          id: inferred.id,
          inferred,
        });

        return acc;
      },
      [...unconnected]
    )
    .sort(transactionSorterByDate);
};

//

export const readStructuredAggregatedTransactionByYearMonth = async (
  year: string,
  month: string
) => {
  const all = (await readAggregatedTransactions()).filter((agg) => {
    const date = agg.date!.split('-');
    return date[0] === year && date[1] === month;
  });

  const allSorted = all
    .sort(transactionSorterByObject)
    .sort(transactionSorterByDate);

  return C.mapObj(groupByDate(allSorted), (list) => ({
    connected: list.filter((t) => t.status === TransactionStatus.CONNECTED),
    unconnected: list.filter(
      (t) =>
        t.status === TransactionStatus.UNCONNECTED ||
        t.status === TransactionStatus.AUTO_MATCHED
    ),
    inferred: list.filter((t) => t.status === TransactionStatus.INFERRED),
  }));
};

//

export const readAllTransactionYearMonths = async () =>
  (await readAggregatedTransactions()).reduce(
    (acc, agg) => {
      const [year, month] = agg.date.split('-');
      if (!acc[year]) acc[year] = [];
      if (!acc[year].includes(month))
        acc[year] = acc[year].concat(month).sort();
      return acc;
    },
    {} as Record<string, string[]>
  );

//

export const readAllPayees = async () =>
  (await readTransactions()).reduce(
    (acc, t) => (acc.includes(t.payee) ? acc : acc.concat(t.payee)),
    [] as string[]
  );
