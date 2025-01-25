import React, { useMemo, useState } from 'react';
import type {
  ActionFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';

import {
  equalTransactions,
  PostingType,
  StructuredTransactionAggregations,
  structureTransactions,
  Transaction,
  transactionSorterByDate,
  transactionSorterByObject,
} from '~/utils/ledger';
import {
  readAggregatedTransactionsByYearMonth,
  readAllPayees,
  TransactionAggregation,
  TransactionStatus as TStatus,
  writeTransaction,
} from '~/io/journals';
import { readAccountDataMap } from '~/io/accounts';
import * as C from '~/utils/common';

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
  transactions: await readAggregatedTransactionsByYearMonth(
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

enum Grouping {
  DATE = 'date',
  SUBJECT = 'subject',
  OBJECT = 'object',
}

enum Sorting {
  GROUP = 'group',
  GROUP_SIZE = 'group size',
}

enum SubMenu {
  GROUPING = 'grouping',
  SORTING = 'sorting',
  EDIT = 'edit',
}

export default function Register$Year$Month() {
  const write = useWriteTransaction();
  const { transactions } = useLoaderData<typeof loader>();

  const [selected, setSelected] = useState<TransactionAggregation>();
  const [pendingConnection, setPendingConnection] = useState(false);

  const [subMenu, setSubMenu] = useState<SubMenu | null>(null);

  const [search, setSearch] = useState<string | null>(null);
  const [grouping, setGrouping] = useState(Grouping.DATE);
  const [sorting, setSorting] = useState(Sorting.GROUP);

  //

  const groupedStructured = useMemo(
    () =>
      // Group by current grouping type and create entries
      Object.entries(
        C.groupBy(transactions, (t) =>
          grouping === Grouping.DATE
            ? t.date
            : (t.declared ?? t.inferred)!.postings.find((p) =>
                grouping === Grouping.OBJECT
                  ? p.type === PostingType.OBJECT
                  : p.type === PostingType.SUBJECT
              )!.account
        )
      )
        // Sort the groups
        .sort(([aK, aV], [bk, bV]) =>
          sorting === Sorting.GROUP ? (aK > bk ? 1 : -1) : bV.length - aV.length
        )
        // Sort the transactions in the group and structure
        .map(([k, v]) => [
          k,
          structureTransactions(
            v.sort(
              grouping === Grouping.DATE
                ? transactionSorterByDate
                : transactionSorterByObject
            )
          ),
        ]) as [string, StructuredTransactionAggregations][],
    [transactions, grouping, sorting]
  );

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

  const deselect = () => setSelected(undefined);

  const applyGrouping = (value: Grouping) => {
    setGrouping(value);
    setSubMenu(null);
  };

  const applySorting = (value: Sorting) => {
    setSorting(value);
    setSubMenu(null);
  };

  //

  useRequestKeyBindings(
    subMenu === SubMenu.EDIT
      ? null
      : subMenu ||
          (selected
            ? selected.status + (showConnectMsg ? ':connect' : '')
            : 'default')
  );

  const dynamicAutoMatchBindings = equalTransactions(declared!, inferred!)
    ? [['a', 'accept', () => connect(declared!, inferred!)]]
    : [
        ['f', 'accept first', () => connect(inferred!, declared!)],
        ['s', 'accept second', () => connect(declared!, inferred!)],
      ];

  useRegisterKeyBindings({
    default: [
      ['/', 'search', () => {}],
      ['g', 'group by', () => setSubMenu(SubMenu.GROUPING)],
      ['s', 'sort by', () => setSubMenu(SubMenu.SORTING)],
    ],
    grouping: [
      ['d', 'date', () => applyGrouping(Grouping.DATE)],
      ['o', 'object', () => applyGrouping(Grouping.OBJECT)],
      ['s', 'subject', () => applyGrouping(Grouping.SUBJECT)],
    ],
    sorting: [
      ['g', 'group', () => applySorting(Sorting.GROUP)],
      ['s', 'group size', () => applySorting(Sorting.GROUP_SIZE)],
    ],
    [TStatus.CONNECTED]: [
      ['e', 'edit', () => setSubMenu(SubMenu.EDIT)],
      ['Escape', 'deselect', deselect],
    ],
    [TStatus.UNCONNECTED]: [
      ['e', 'edit', () => setSubMenu(SubMenu.EDIT)],
      ['c', 'connect over', () => setPendingConnection(true)],
      ['Escape', 'deselect', () => deselect],
    ],
    [TStatus.UNCONNECTED + ':connect']:
      'select an unconnected transaction to override',
    [TStatus.INFERRED]: [
      ['d', 'declare', () => writeTransaction(inferred!)],
      ['e', 'declare through edit', () => setSubMenu(SubMenu.EDIT)],
      ['c', 'connect over', () => setPendingConnection(true)],
      ['Escape', 'deselect', deselect],
    ],
    [TStatus.INFERRED + ':connect']:
      'select an inferred transaction to override',
    [TStatus.AUTO_MATCHED]: [
      ...(dynamicAutoMatchBindings as KeyBinding[]),
      ['e', 'edit', () => setSubMenu(SubMenu.EDIT)],
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

  return (
    <>
      <div className="scroll-auto height-full p-20">
        <div className="fixed top-0 left-0 w-full px-20 py-1 border-b border-gray-200 text-sm bg-white z-10 text-gray-500 flex">
          {search && (
            <div className="px-4">
              search:{' '}
              <input
                value={search}
                placeholder="''"
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="px-4">grouping: {grouping}</div>
          <div className="px-4">sorting: {sorting}</div>
        </div>
        <div className="flex flex-col justify-center gap-20 py-24 px-4">
          {groupedStructured.map(
            ([key, { connected, unconnected, inferred }]) => (
              <div key={key} className="flex flex-col gap-6">
                <div className="text-gray-500">{key}</div>
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
      {subMenu === SubMenu.EDIT && selected && (
        <EditModal
          transaction={(declared ?? inferred)!}
          exit={() => setSubMenu(null)}
        />
      )}
    </>
  );
}
