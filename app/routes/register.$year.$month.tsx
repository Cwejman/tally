import React, { useState } from 'react';
import type {
  ActionFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import {
  equalTransactions,
  sameTransactions,
  Transaction,
} from '~/utils/ledger';
import {
  readStructuredAggregatedTransactionByYearMonth,
  TransactionAggregation,
  TransactionStatus as TStatus,
  writeTransaction,
} from '~/io/journals';
import { readAccountDataMap } from '~/io/accounts';
import { useKeyPress } from '~/hooks/useKeypress';

import { KeyBinding, Shortcuts } from './_components/shortcuts';
import { EditModal } from './_components/edit-modal';
import { TransactionGroup } from './_components/transaction-group';
import { useVisibleIndex } from '~/hooks/useVisibleElement';

export const meta: MetaFunction = ({ params }) => [
  { title: `Ledger: Register ${params.year}-${params.month}` },
];

//

export const loader = async ({ params }: LoaderFunctionArgs) => ({
  accountDataMap: await readAccountDataMap(),
  structuredTransactions: await readStructuredAggregatedTransactionByYearMonth(
    params.year!,
    params.month!
  ),
});

export const action: ActionFunction = async ({ request }) => {
  await writeTransaction(await request.json());
  return new Response(null, { status: 200 });
};

//

export default function Register$Year$Month() {
  const [selected, setSelected] = useState<TransactionAggregation>();
  const [edit, setEdit] = useState<Transaction>();
  const [pendingConnection, setPendingConnection] = useState(false);

  const { structuredTransactions } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [visibleAggregation, setAggregationRef] =
    useVisibleIndex<TransactionAggregation>(0.1, sameTransactions);

  const { declared, inferred } = selected ?? {};

  //

  const dispatchWriteTransaction = (transaction: Transaction) => {
    setSelected(undefined);

    fetcher.submit(transaction as Record<string, any>, {
      method: 'POST',
      encType: 'application/json',
    });
  };

  const connect = (base: Transaction, over: Transaction) =>
    dispatchWriteTransaction({
      ...over,
      index: over.index ?? base.index,
      id: over.id ?? base.id,
    });

  //

  const keyBindings = {
    neutral: [
      [
        'ArrowDown',
        'select transaction',
        () =>
          visibleAggregation.current && setSelected(visibleAggregation.current),
      ],
    ],
    edit: [['Escape', 'exit', () => setEdit(undefined)]] as KeyBinding[],
    [TStatus.CONNECTED]: [
      ['e', 'edit', () => setEdit((declared ?? inferred)!)],
      ['Escape', 'deselect', () => setSelected(undefined)],
    ] as KeyBinding[],
    [TStatus.UNCONNECTED]: [
      ['e', 'edit', () => setEdit((declared ?? inferred)!)],
      ['c', 'connect over', () => setPendingConnection(true)],
      ['Escape', 'deselect', () => setSelected(undefined)],
    ] as KeyBinding[],
    [TStatus.INFERRED]: [
      ['d', 'declare', () => dispatchWriteTransaction(inferred!)],
      ['e', 'declare through edit', () => setEdit((declared ?? inferred)!)],
      ['c', 'connect over', () => setPendingConnection(true)],
      ['Escape', 'deselect', () => setSelected(undefined)],
    ] as KeyBinding[],
    [TStatus.AUTO_MATCHED]: [
      ...(equalTransactions(declared!, inferred!)
        ? [['a', 'accept', () => connect(declared!, inferred!)]]
        : [
            ['f', 'accept first', () => connect(inferred!, declared!)],
            ['s', 'accept second', () => connect(declared!, inferred!)],
          ]),
      ['e', 'edit', () => setEdit((declared ?? inferred)!)],
      ['Escape', 'deselect', () => setSelected(undefined)],
    ] as KeyBinding[],
  };

  const shortcutsBindings =
    (edit && keyBindings['edit']) ||
    (selected && keyBindings[selected.status]) ||
    keyBindings['neutral'];

  const shortcutsMsg =
    pendingConnection &&
    (selected?.status === TStatus.INFERRED
      ? 'select an unconnected transaction to override'
      : 'select an inferred transaction to override');

  useKeyPress(
    (pressedKey) => {
      console.log(pressedKey);
      const binding = shortcutsBindings?.find(([key]) => key === pressedKey);
      (binding?.[2] as () => void)?.();
    },
    [selected, edit]
  );

  const handleClick = (aggregation: TransactionAggregation) => {
    if (pendingConnection) {
      const first = (declared ?? inferred)!;
      const second = (aggregation.declared ?? aggregation.inferred)!;
      connect(first, second);
      setPendingConnection(false);
    } else {
      setSelected(aggregation);
    }
  };

  return (
    <>
      <div className="scroll-auto height-full p-20">
        <div className="flex flex-col justify-center gap-20 py-24 px-4">
          {Object.entries(structuredTransactions).map(
            ([date, { connected, unconnected, inferred }]) => (
              <div key={date} className="flex flex-col gap-6">
                <div className="text-gray-500">{date}</div>
                <TransactionGroup
                  onClick={handleClick}
                  transactions={connected}
                  selected={[selected]}
                  heading="Connected"
                  rowRef={setAggregationRef}
                />
                <TransactionGroup
                  onClick={handleClick}
                  transactions={unconnected}
                  selected={[selected]}
                  heading="Unconnected"
                  rowRef={setAggregationRef}
                />
                <TransactionGroup
                  onClick={handleClick}
                  transactions={inferred}
                  selected={[selected]}
                  heading="Inferred"
                  rowRef={setAggregationRef}
                />
              </div>
            )
          )}
        </div>
      </div>
      <EditModal transaction={edit} />
      <Shortcuts data={shortcutsMsg || shortcutsBindings} />
    </>
  );
}

//
