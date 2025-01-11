import { Posting, PostingType, Transaction } from '~/utils/ledger';
import { Label } from '~/components/label';
import { useAccountIcon } from '~/hooks/useAccountIcon';
import React from 'react';

interface TransactionRowProps {
  transaction: Transaction;
}

export const TransactionRow = React.forwardRef<
  HTMLDivElement,
  TransactionRowProps
>(({ transaction: { amount, postings, payee } }, ref) => {
  const objects = postings.filter((p) => p.type === PostingType.OBJECT);
  const subjects = postings.filter((p) => p.type === PostingType.SUBJECT);

  return (
    <div className="flex gap-2 p-1 rounded-md" ref={ref}>
      <Label style="outline-heavy" amount={amount} label={payee} />
      {objects.map((posting, i) => (
        <PostingSelect
          key={i}
          posting={posting}
          hideAmount={objects.length === 1}
        />
      ))}
      {subjects.map((posting, i) => (
        <PostingSelect
          key={i}
          style="outline"
          hideAmount={subjects.length === 1}
          posting={posting}
        />
      ))}
    </div>
  );
});

//

interface PostingSelectProps {
  posting: Posting;
  style?: 'default' | 'outline' | 'slate';
  hideAmount?: boolean;
}

const PostingSelect = ({
  posting: { amount, account },
  style = 'default',
  hideAmount = false,
}: PostingSelectProps) => {
  const icon = useAccountIcon(account);
  const path = account.split(':');
  const childName = path[path.length - 1];

  return (
    <Label
      style={style}
      icon={icon}
      amount={hideAmount ? undefined : amount}
      label={childName}
    />
  );
};
