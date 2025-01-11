import React from 'react';
import { Transaction } from '~/utils/ledger';

export interface EditModalProps {
  transaction?: Transaction;
}

export const EditModal = ({ transaction: t }: EditModalProps) =>
  t && (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg w-96 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">{t.payee}</div>
        {t.postings.map((p, i) => (
          <div key={i} className="px-4 py-3 border-b border-gray-200">
            {p.account}
          </div>
        ))}
        <div className="mb-[-1px]" />
      </div>
    </div>
  );
