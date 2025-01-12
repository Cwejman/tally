import { TransactionAggregation, TransactionStatus } from '~/io/journals';
import { TransactionRow } from './transaction-row';
import { equalTransactions } from '~/utils/ledger';

export interface TransactionGroupProps {
  heading: string;
  transactions: TransactionAggregation[];
  selected: (TransactionAggregation | undefined)[];
  onClick: (aggregation: TransactionAggregation) => void;
}

export const TransactionGroup = ({
  heading,
  transactions,
  selected,
  onClick,
}: TransactionGroupProps) =>
  !!transactions.length && (
    <div className="flex flex-col items-left gap-2">
      <div className="text-gray-600 font-medium">{heading}</div>
      {transactions.map((aggregation, i) => (
        <div
          key={i}
          className={`px-1 -ml-1 border rounded-md
            ${
              aggregation.status === TransactionStatus.AUTO_MATCHED
                ? !selected.includes(aggregation)
                  ? 'bg-yellow-500/10 border py-1 hover:bg-yellow-500/15' +
                    ' hover:border-yellow-500/35'
                  : 'py-1'
                : ''
            }
            ${
              selected?.includes(aggregation)
                ? 'border-blue-300 border-dashed bg-blue-200/30'
                : 'border-gray-50/0 hover:bg-gray-50 hover:border-gray-200'
            }`}
          onClick={() => onClick(aggregation)}
        >
          {aggregation.status !== TransactionStatus.INFERRED && (
            <TransactionRow transaction={aggregation.declared!} />
          )}
          {(aggregation.status === TransactionStatus.INFERRED ||
            (aggregation.status === TransactionStatus.AUTO_MATCHED &&
              !equalTransactions(
                aggregation.declared,
                aggregation.inferred
              ))) && <TransactionRow transaction={aggregation.inferred!} />}
        </div>
      ))}
    </div>
  );
