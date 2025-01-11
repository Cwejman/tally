import { useLoaderData } from '@remix-run/react';
import { loader } from '~/routes/register.$year.$month';

export const useAccountIcon = (account: string) => {
  const { accountDataMap } = useLoaderData<typeof loader>();

  if (!accountDataMap)
    throw new Error('[useAccountIcon] requires accountDataMap from loader');

  const accountKeysWithIcons = Object.entries(accountDataMap)
    .filter(([_, { icon }]) => !!icon)
    .map(([key]) => key);

  const iconKey = !!accountDataMap[account]?.icon
    ? account
    : account
        .split(':')
        .map((_, i, parts) => parts.slice(0, i + 1).join(':'))
        .reverse()
        .find((parent) => accountKeysWithIcons.includes(parent));

  return iconKey && accountDataMap[iconKey]?.icon;
};
