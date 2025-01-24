import React, { useState } from 'react';
import type {
  ActionFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { equalTransactions, Transaction } from '~/utils/ledger';
import {
  readAllPayees,
  readStructuredAggregatedTransactionByYearMonth,
  TransactionAggregation,
  TransactionStatus as TStatus,
  writeTransaction,
} from '~/io/journals';
import { readAccountDataMap } from '~/io/accounts';

import { EditModal } from './_components/edit-modal';
import { TransactionGroup } from './_components/transaction-group';
import {
  KeyBinding,
  useRegisterKeyBindings,
  useRequestKeyBindings,
} from '~/context/keybindings';

export const meta: MetaFunction = ({ params }) => [
  { title: `Ledger: Register ${params.year}-${params.month}` },
];

//

export const loader = async ({ params }: LoaderFunctionArgs) => ({
  accountDataMap: await readAccountDataMap(),
  allPayees: await readAllPayees(),
  structuredTransactions: await readStructuredAggregatedTransactionByYearMonth(
    params.year!,
    params.month!
  ),
});

export const action: ActionFunction = async ({ request }) => {
  await writeTransaction(await request.json());
  return new Response(null, { status: 200 });
};

export const useWriteTransaction = () => {
  const fetcher = useFetcher();

  return (transaction: Transaction) => {
    fetcher.submit(transaction as Record<string, any>, {
      method: 'POST',
      encType: 'application/json',
    });
  };
};

//

export default function Register$Year$Month() {
  const write = useWriteTransaction();
  const { structuredTransactions } = useLoaderData<typeof loader>();

  const [selected, setSelected] = useState<TransactionAggregation>();
  const [pendingConnection, setPendingConnection] = useState(false);
  const [edit, setEdit] = useState<Transaction>();

  //

  const { declared, inferred } = selected ?? {};

  const showConnectMsg =
    pendingConnection && selected?.status === TStatus.INFERRED;

  //

  const writeTransaction = (transaction: Transaction) => {
    write(transaction);
    setSelected(undefined);
  };

  const connect = (base: Transaction, over: Transaction) =>
    writeTransaction({
      ...over,
      index: over.index ?? base.index,
      id: over.id ?? base.id,
    });

  const startEdit = () => setEdit((declared ?? inferred)!);
  const deselect = () => setSelected(undefined);

  //

  useRequestKeyBindings(
    edit
      ? null
      : selected
        ? selected.status + (showConnectMsg ? ':connect' : '')
        : 'default'
  );

  const dynamicAutoMatchBindings = equalTransactions(declared!, inferred!)
    ? [['a', 'accept', () => connect(declared!, inferred!)]]
    : [
        ['f', 'accept first', () => connect(inferred!, declared!)],
        ['s', 'accept second', () => connect(declared!, inferred!)],
      ];

  useRegisterKeyBindings({
    [TStatus.CONNECTED]: [
      ['e', 'edit', startEdit],
      ['Escape', 'deselect', deselect],
    ],
    [TStatus.UNCONNECTED]: [
      ['e', 'edit', startEdit],
      ['c', 'connect over', () => setPendingConnection(true)],
      ['Escape', 'deselect', () => deselect],
    ],
    [TStatus.UNCONNECTED + ':connect']:
      'select an unconnected transaction to override',
    [TStatus.INFERRED]: [
      ['d', 'declare', () => writeTransaction(inferred!)],
      ['e', 'declare through edit', startEdit],
      ['c', 'connect over', () => setPendingConnection(true)],
      ['Escape', 'deselect', deselect],
    ],
    [TStatus.INFERRED + ':connect']:
      'select an inferred transaction to override',
    [TStatus.AUTO_MATCHED]: [
      ...(dynamicAutoMatchBindings as KeyBinding[]),
      ['e', 'edit', startEdit],
      ['Escape', 'deselect', deselect],
    ],
  });

  //

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

  console.log(structuredTransactions);

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
                />
                <TransactionGroup
                  onClick={handleClick}
                  transactions={unconnected}
                  selected={[selected]}
                  heading="Unconnected"
                />
                <TransactionGroup
                  onClick={handleClick}
                  transactions={inferred}
                  selected={[selected]}
                  heading="Inferred"
                />
              </div>
            )
          )}
        </div>
      </div>
      {edit && <EditModal transaction={edit} exit={() => setEdit(undefined)} />}
    </>
  );
}
