import React, { useEffect, useState } from 'react';
import { Transaction } from '~/utils/ledger';
import { Prefix, PrefixStr } from '~/components/prefix';
import { useGetAccountIcon } from '~/hooks/useGetAccountIcon';
import * as C from '~/utils/common';
import { twoDigNum } from '~/utils/common';
import { useLoaderData } from '@remix-run/react';
import { loader, useWriteTransaction } from '~/routes/register.$year.$month';
import {
  KeyBinding,
  useRegisterKeyBindings,
  useRequestKeyBindings,
} from '~/context/keybindings';

export type EditProp =
  | ':posting'
  | ':posting:amount'
  | ':posting:account'
  | ':date'
  | ':payee'
  | undefined;

export interface EditModalProps {
  transaction: Transaction;
  exit: () => void;
}

const countingMap = ['1st', '2nd', '3rd', '4th', '5th', '6th', '8th'];

export const EditModal = ({ transaction, exit }: EditModalProps) => {
  const write = useWriteTransaction();
  const getIcon = useGetAccountIcon();
  const { allPayees } = useLoaderData<typeof loader>();

  const [search, setSearch] = useState<string>('');
  const [confirmExit, setConfirmExit] = useState<boolean>(false);
  const [body, setBody] = useState<Transaction>(transaction);
  const [prop, setProp] = useState<EditProp>();
  const [posting, setPosting] = useState<number | undefined>();
  const [selected, setSelected] = useState<string | undefined>();

  //

  const searchResults =
    prop === ':payee'
      ? allPayees.filter((payee) =>
          payee.toLowerCase().startsWith(search.toLowerCase())
        )
      : null;

  const postingsWithIcons = transaction.postings.map((p) => ({
    ...p,
    icon: getIcon(p.account),
  }));

  const searchViewActive = prop === ':posting:account' || prop === ':payee';

  //

  const shiftPrefix = (t: Transaction) => ({
    ...t,
    prefix: ['*', '!', '@'][(['*', '!', '@'].indexOf(t.prefix) + 1) % 3],
  });

  const save = () => {
    write(body!);
    exit();
  };

  const safeExit = () => {
    if (C.deepCompare(body, transaction)) exit();
    else setConfirmExit(true);
  };

  const exitSearch = (prop?: EditProp) => {
    setProp(prop);
    setSearch('');
  };

  const selectInDirection = (dir: -1 | 1) =>
    searchResults?.length &&
    setSelected(
      searchResults[
        C.absMod(
          searchResults.length,
          selected ? searchResults.indexOf(selected) + dir : 0
        )
      ]
    );

  const searchChoose = (exitTo: EditProp) => {
    if (prop === ':payee') {
      setBody({ ...body!, payee: selected ?? search });
    }
    if (prop === ':posting:account') {
      setBody({
        ...body!,
        postings: body!.postings.map((p, i) =>
          i === posting ? { ...p, account: selected ?? search } : p
        ),
      });
    }

    exitSearch(exitTo);
  };

  //

  useRequestKeyBindings(
    confirmExit ? 'edit:confirmExit' : 'edit' + (prop ?? '')
  );

  const dynamicPostingsBindings: KeyBinding[] = body?.postings.map((p, i) => [
    `${i + 1}`,
    `${countingMap[i]} p.`,
    () => {
      setProp(':posting');
      setPosting(i);
    },
  ]);

  const selectBindings: KeyBinding[] = [
    ['ArrowUp', 'select prev', () => selectInDirection(-1)],
    ['ArrowDown', 'select next', () => selectInDirection(1)],
    ...(selected
      ? ([['Enter', 'choose selected payee', searchChoose]] as KeyBinding[])
      : search
        ? ([['Enter', 'choose new payee', searchChoose]] as KeyBinding[])
        : []),
  ];

  useRegisterKeyBindings({
    edit: [
      ['Escape', 'exit', safeExit],
      ['s', 'save', () => save],
      ['d', 'date', () => setProp(':date')],
      ['p', 'payee', () => setProp(':payee')],
      ['P', 'prefix', () => setBody(shiftPrefix)],
      ...((dynamicPostingsBindings as KeyBinding[]) ?? []),
    ],
    'edit:confirmExit': [
      ['y', 'yes', exit],
      ['n', 'no', () => setConfirmExit(false)],
    ],
    'edit:posting': [
      ['Escape', 'back', () => setProp(undefined)],
      ['a', 'account', () => setProp(':posting:account')],
      ['A', 'amount', () => setProp(':posting:amount')],
    ],
    'edit:posting:account': [
      ['Escape', 'back', () => exitSearch(':posting')],
      ...selectBindings,
    ],
    'edit:posting:amount': [['Escape', 'back', () => setProp(':posting')]],
    'edit:payee': [['Escape', 'back', () => exitSearch()], ...selectBindings],
    'edit:date': [['Escape', 'back', () => setProp(undefined)]],
  });

  //

  useEffect(() => {
    if (!search || searchResults?.length === 0) setSelected(undefined);
  }, [search, searchResults]);

  useEffect(() => {
    if (prop === ':payee') setSelected(body.payee);
    if (prop === ':posting:account')
      setSelected(body.postings[posting!].account);
  }, [prop]);

  //

  return (
    <div className="modal fixed inset-0 flex items-center justify-center bg-gray-500/85 backdrop-grayscale">
      <div className="bg-white rounded-lg shadow-lg min-w-96 overflow-hidden">
        {searchViewActive ? (
          <div className="modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg min-w-96 overflow-hidden">
              <input
                className="px-4 py-3 w-full outline-none"
                placeholder="Search payee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <div className="overflow-scroll max-h-96">
                {searchResults &&
                  searchResults.map((text, i) => (
                    <div
                      key={text}
                      className={
                        'py-2 px-4 border-b border-gray-200 ' +
                        (selected === text ? 'bg-blue-100' : '')
                      }
                    >
                      {text}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex py-3 border-b border-gray-200">
              <div className="pl-4 text-gray-600 font-medium">{body.date}</div>
              <div className="pl-3 pr-10 flex-grow font-medium">
                {body.payee}
              </div>
              {body.prefix && (
                <div className="pr-4 flex items-center justify-center">
                  <Prefix prefix={body.prefix as PrefixStr} />
                </div>
              )}
            </div>
            {postingsWithIcons.map((p, i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-200">
                {p.icon && <span className="mr-2">{p.icon}</span>}
                {p.account}
                {p.amount && (
                  <span className="pl-10 font-medium">
                    {twoDigNum(p.amount)}{' '}
                    <span className="font-normal opacity-90">{p.currency}</span>
                  </span>
                )}
              </div>
            ))}
            <div className="mb-[-1px]" />
          </>
        )}
      </div>
    </div>
  );
};
