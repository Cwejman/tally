import fs from 'fs/promises';

export interface MatchFnInput {
  string: string;
}

export interface MatchFnOutput {
  name: string;
}

type MatchFn = (input: MatchFnInput, params: string) => MatchFnOutput | null;

const matchFnMap: Record<string, MatchFn> = {
  match: (input, params) => {
    const name = params.match(/^[^\/\-!@]+/)?.[0].trim();
    if (!name)
      throw new Error(
        '[match]: No valid payee found for' + ' params: ' + params
      );

    const regex = params.match(/(?<=\/)([^\/]+)(?=\/)/)?.[1];
    const matcher = new RegExp(regex || name.toLowerCase());

    return input.string.toLowerCase().match(matcher) ? { name } : null;
  },
};

interface AccountData {
  icon?: string;
  match: (input: MatchFnInput) => MatchFnOutput | null;
  accountNo?: string;
}

const matchByFirstSucessfullMatchFn = (
  commands: string[],
  account: string,
  input: MatchFnInput
) => {
  for (const cmd of commands) {
    const match = cmd.match(/^(\S+)\s+(.*)/);
    if (!match)
      throw new Error(`Invalid cmd line: "; ${cmd}" for account ${account}`);

    const [_, key, params] = match;
    const matchFn = matchFnMap[key];
    const result = matchFn && matchFn(input, params);

    if (result) return result;
  }

  return null;
};

export const readAccountDataMap = async (): Promise<
  Record<string, AccountData>
> => {
  const accountCommandEntries = (
    await fs.readFile(process.env.DATA_DIR! + '/main.ledger', 'utf8')
  )
    .split('\n')
    .reduce(
      (acc, line) => {
        let lastEntry = acc[acc.length - 1];
        const endsWithEmptyArr = lastEntry?.length === 0;

        if (line.startsWith('account')) {
          // If entries ends with empty array remove
          // FIXME Does not seem to work
          if (endsWithEmptyArr) acc.slice(0, -1);
          // Add account to entries
          acc.push([line.split(' ')[1]]);
        } else if (!endsWithEmptyArr) {
          if (line.startsWith(';')) {
            // Add param to last entry
            acc.slice(0, -1);
            acc.push([...lastEntry, line.slice(2)]);
          } else {
            // Push empty arr to prevent more params from being added to this
            // account. Only params immediately after an account should be added.
            acc.push([]);
          }
        }

        return acc;
      },
      [[]] as string[][]
    )
    .filter((x) => !!x.length);

  return Object.fromEntries(
    accountCommandEntries.map(([account, ...commands]) => [
      account,
      {
        icon: commands
          .find((param) => param.startsWith('icon'))
          ?.split(' ')
          .slice(1)
          .join(' '),
        match: (input: MatchFnInput) =>
          matchByFirstSucessfullMatchFn(commands, account, input),
        accountNo: commands
          .find((param) => param.startsWith('accountNo'))
          ?.split(' ')
          .slice(1)
          .join(' '),
      },
    ])
  );
};
