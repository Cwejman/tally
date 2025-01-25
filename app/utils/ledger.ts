import * as C from './common';
import { TransactionAggregation, TransactionStatus } from '~/io/journals';

export enum PostingType {
  SUBJECT,
  OBJECT,
}

export interface Posting {
  currency: string;
  account: string;
  amount?: number;
  type: PostingType;
}

export interface Transaction {
  id?: number; // Defined if connected
  index?: number; // Defined is declared in / read from file
  amount: number; // Amount in regard to the subject postings
  postings: Posting[];
  date: string;
  payee: string;
  prefix: string;
  comment?: string;
}

/**
 * This parses a plain-text file into an array of its transactions. It also
 * extracts the id-tag from the comment if defined. If transfer between
 * owned accounts, make sure the debit posting has the defined value – this is
 * the standard the application relies on and write it back upon save.
 */

export const parseJournal = (text: string): Transaction[] =>
  text
    .split('\n')
    .map((line) => line.trimEnd())
    .reduce((acc, val) => {
      if (val.match(/^\d\d\d\d-\d\d-\d\d/)) {
        return [...acc, [val]];
      } else {
        const prev = acc[acc.length - 1];
        if (!prev)
          throw new Error('.ledger files cannot start with empty lines');
        return [...acc.slice(0, -1), prev.concat(val)];
      }
    }, [] as string[][])
    .map(([head, ...tail], index) => {
      const toErr = (msg: string) =>
        msg + '\nSee: \n' + [head, ...tail].join('\n');

      const match = head.match(/^(.*?) (.) (.*?)(?:$| ; | $| ;)(.*)/);
      if (!match) throw new Error(toErr('regex failed on first line'));

      const [_, date, prefix, payee, rawComment] = match;

      const id = rawComment.match(/.*?#(\d+)/)?.[1];
      const comment = rawComment.replace(/#(\d+)/, '').trim();

      //

      const rawPostings = tail
        .filter((line) => !line.match(/^(?:$|  *$|  *\n$|\n$|;.*$)/))
        .map((el, i) => {
          const match = el.match(/^  *(.*?)(?:  *(.*?) (.*?)$|$)/);
          if (!match) throw new Error(toErr('regex fail entry ' + i));

          const [_, account, amount, currency] = match;

          return {
            account,
            currency,
            amount: !!amount ? parseFloat(amount) : undefined,
          };
        });

      const [postings, amount] = standardizePostings(rawPostings);

      const withoutAmount = postings.filter((p) => p.amount === undefined);
      if (withoutAmount.length > 1) {
        throw new Error(
          toErr(
            'There can only be one posting without an amount per ledger transaction'
          )
        );
      }

      const currencies = C.uniq(
        postings.filter((e) => !!e.currency).map((e) => e.currency)
      );
      if (currencies.length > 1) {
        throw new Error(
          toErr('There can only be one currency per ledger transaction')
        );
      }

      return {
        postings: postings.map((p) => ({ ...p, currency: currencies[0] })),
        index,
        amount,
        date,
        prefix,
        payee,
        comment: comment ? comment?.trim() : undefined,
        id: id ? parseInt(id) : undefined,
      };
    })
    .filter((el) => el.date);

//

/**
 *  Render a transaction to text, used for writing a transaction back into
 *  plain-text .ledger format.
 */

export const transactionToPlainText = ({
  date,
  prefix = '*',
  payee,
  postings,
  comment,
  id,
}: Transaction) => {
  const sorted = postings.sort((a, b) => (a?.amount ?? 0) - (b?.amount ?? 0));

  const ordered = [
    ...sorted.filter((p) => (p.type = PostingType.OBJECT)),
    ...sorted.filter((p) => (p.type = PostingType.SUBJECT)),
  ];

  const toAmount = (p: Posting) =>
    p.amount
      ? `${' '.repeat(50 - p.account.length)}${C.twoDigNum(p.amount)} ${p.currency}`
      : '';

  return [
    `${date} ${prefix} ${payee}${(id || comment ? ' ; ' : '') + (comment ? `${comment} ` : '') + (id ? `#${id}` : '')}`,
    ...ordered.map((p) => `    ${p.account} ${toAmount(p)}`),
  ].join('\n');
};

//

export const isPostingOwned = (posting: Pick<Posting, 'account'>) =>
  posting.account.startsWith('Asset') || posting.account.startsWith('Equity');

//

/**
 * Add type to the postings, the accounts that you own are the subjects to the
 * transactions purpose, the object therefore is the opposite.
 *
 * If a not-owned account is involved, the nature of the transaction is an
 * expense of some kind. Therefore, the owned account is the subject and the
 * not-owned the object. However, if the transaction is between owned
 * accounts only, then the subjects are the debit postings. This as it feel
 * right and provides a standard in how transaction are structured and
 * presented.
 *
 * The postings are restructured so that the subjects always have the
 * defined amounts and the undefined amount is set to the first
 * expense-posting in the list.
 *
 * With these previously defined rules there is a standard to how
 * transactions are written, this for the reason of coherency – and the
 * format is derived from what feels right.
 *
 * Also get the amount, sum relative to the subject postings. This is the value
 * the user is to be presented, as it the subject that one relates to when
 * reading a transaction.
 */

export const standardizePostings = (
  postings: Omit<Posting, 'type'>[]
): [postings: Posting[], amount: number] => {
  const definedSum = postings.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const undefinedValue = -definedSum;
  const ownedPostings = postings.filter(isPostingOwned);
  const allIsOwned = postings.length === ownedPostings.length;

  const subjects = ownedPostings.filter((p) =>
    allIsOwned
      ? (p.amount ?? undefinedValue) > 0
      : (p.amount ?? undefinedValue) < 0
  );

  const objects = postings.filter((p) => !subjects.includes(p));

  const standardizedPostings = [...objects, ...subjects].map((p, i) => ({
    ...p,
    type: subjects.includes(p) ? PostingType.SUBJECT : PostingType.OBJECT,
    // Since objects come first make the first object with undefined amount
    amount: i === 0 ? undefined : (p.amount ?? -definedSum),
  }));

  const amount = standardizedPostings
    .filter((p) => p.type === PostingType.SUBJECT)
    .reduce((sum, p) => sum + p.amount!, 0);

  return [standardizedPostings, amount];
};

//

export const transactionSorterByObject = (
  a: Transaction | TransactionAggregation,
  b: Transaction | TransactionAggregation
) => {
  const aPostings =
    'postings' in a
      ? a.postings
      : (a.declared?.postings ?? a.inferred?.postings)!;

  const bPostings =
    'postings' in b
      ? b.postings
      : (b.declared?.postings ?? b.inferred?.postings)!;

  const aAccount = aPostings.find(
    (p) => p.type === PostingType.OBJECT
  )!.account;

  const bAccount = bPostings.find(
    (p) => p.type === PostingType.OBJECT
  )!.account;

  return aAccount.localeCompare(bAccount);
};

//

export const transactionSorterByDate = (
  a: Transaction | TransactionAggregation,
  b: Transaction | TransactionAggregation
) => new Date(a.date).getTime() - new Date(b.date).getTime();

//

export const groupByDate = <T extends Transaction | TransactionAggregation>(
  transactions: T[]
) =>
  transactions.reduce(
    (acc, transaction) => ({
      ...acc,
      [transaction.date]: (acc[transaction.date] ?? []).concat(transaction),
    }),
    {} as Record<string, T[]>
  );

//

export interface StructuredTransactionAggregations {
  connected: TransactionAggregation[];
  unconnected: TransactionAggregation[]; // Includes auto-matched
  inferred: TransactionAggregation[];
}

export const structureTransactions = (
  list: TransactionAggregation[]
): StructuredTransactionAggregations => ({
  connected: list.filter((t) => t.status === TransactionStatus.CONNECTED),
  unconnected: list.filter(
    (t) =>
      t.status === TransactionStatus.UNCONNECTED ||
      t.status === TransactionStatus.AUTO_MATCHED
  ),
  inferred: list.filter((t) => t.status === TransactionStatus.INFERRED),
});

//

export const equalTransactions = (a?: Transaction, b?: Transaction) =>
  C.deepCompare(
    [a?.date, a?.amount, a?.payee, a?.postings],
    [b?.date, b?.amount, b?.payee, b?.postings]
  );

export const sameTransactions = (
  a: Transaction | TransactionAggregation,
  b: Transaction | TransactionAggregation
) => {
  let at = a as unknown as Transaction;
  let bt = b as unknown as Transaction;

  if ('declared' in a) at = (a.declared ?? a.inferred)!;
  if ('inferred' in b) bt = (b.declared ?? b.inferred)!;

  return at.date === bt.date && (at.index === bt.index || at.id === bt.id);
};

/**
 *
 * Expense
 * Asset        -50.00 SEK
 *
 * Asset
 * Asset        -50.00 SEK
 *
 * Asset         50.00 SEK
 * Asset
 *
 * Asset
 * Asset         50.00 SEK
 *
 */
