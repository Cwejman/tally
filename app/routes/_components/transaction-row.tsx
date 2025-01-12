import { Posting, PostingType, Transaction } from '~/utils/ledger';
import { Label, LabelVariants } from '~/components/label';
import { useGetAccountIcon } from '~/hooks/useGetAccountIcon';
import React from 'react';
import { Prefix, PrefixStr } from '~/components/prefix';

interface TransactionRowProps {
  transaction: Transaction;
}

export const TransactionRow = React.forwardRef<
  HTMLDivElement,
  TransactionRowProps
>(({ transaction: { amount, postings, payee, prefix } }, ref) => {
  const objects = postings.filter((p) => p.type === PostingType.OBJECT);
  const subjects = postings.filter((p) => p.type === PostingType.SUBJECT);

  return (
    <div className="flex gap-2 p-1 rounded-md" ref={ref}>
      <Label
        variant="default-heavy"
        amount={amount}
        label={payee}
        rightIcon={prefix !== '*' && <Prefix prefix={prefix as PrefixStr} />}
      />
      {objects.map((posting, i) => (
        <PostingSelect
          variant="muted"
          key={i}
          posting={posting}
          hideAmount={objects.length === 1}
        />
      ))}
      {subjects.map((posting, i) => (
        <PostingSelect
          key={i}
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
  variant?: LabelVariants;
  hideAmount?: boolean;
}

const PostingSelect = ({
  posting: { amount, account },
  variant = 'default',
  hideAmount = false,
}: PostingSelectProps) => {
  const getIcon = useGetAccountIcon();
  const path = account.split(':');
  const childName = path[path.length - 1];

  return (
    <Label
      variant={variant}
      icon={getIcon(account)}
      amount={hideAmount ? undefined : amount}
      label={childName}
    />
  );
};
