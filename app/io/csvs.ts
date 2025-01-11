import { readDirAsList } from '~/utils/fs';
import { getCsvEntryId, parseCsv } from '~/utils/csv';
import fs from 'fs/promises';

//

export const readCsvHeadingMappings = async () => {
  const main = await fs.readFile('../data/main.ledger', 'utf8');

  const config = main.split('\n').find((l) => l.startsWith('; csv'));

  if (!config) {
    throw new Error('No csv heading mappings configured in main.ledger');
  }

  return Object.fromEntries(
    config
      .split(' ')
      .slice(1)
      .map((str) => str.split(':'))
  ) as Record<string, string>;
};

//

export const readCsvTransactions = async () => {
  const csvFilePaths = await readDirAsList('../data', (text, name, path) =>
    name.endsWith('.csv') ? { text, path } : null
  );

  let highestId = csvFilePaths.reduce((acc, { text }) => {
    text.split('\n').forEach((line) => {
      const id = getCsvEntryId(line);
      if (id && id > acc) acc = id;
    });
    return acc;
  }, 1);

  await Promise.all(
    csvFilePaths.map(({ text, path }) => {
      const updated = text
        .split('\n')
        .map((line) => {
          const id = getCsvEntryId(line);
          if (!id) {
            highestId++;
            return line + ';#' + highestId;
          }
          return line;
        })
        .join('\n');

      return fs.writeFile(path, updated);
    })
  );

  const csvFileList = await readDirAsList('../data', (text, name) =>
    name.endsWith('.csv') ? text : null
  );

  const headingMappings = await readCsvHeadingMappings();

  return csvFileList.map((file) => parseCsv(file, headingMappings)).flat();
};
