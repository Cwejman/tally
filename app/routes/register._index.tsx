import type { MetaFunction } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import React from 'react';
import { readAllTransactionYearMonths } from '~/io/journals';

export const meta: MetaFunction = () => [{ title: 'Ledger: Register' }];

//

export const loader = async () => ({
  years: await readAllTransactionYearMonths(),
});

export default function Register_index() {
  const { years } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col justify-center items-center h-full gap-6">
      {Object.entries(years).map(([year, months]) => (
        <div className="flex flex-col items-center gap-3">
          <div>{year}</div>
          <div className="flex gap-2">
            {months.map((month) => (
              <Link className="py-2 px-3" to={`/register/${year}/${month}`}>
                {month}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
