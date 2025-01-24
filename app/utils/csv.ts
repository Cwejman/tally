import * as C from './common';

//

export const getCsvEntryId = (line: string) => {
  const numStr = line.match(/;#(\d+)$/)?.[1];
  return numStr ? parseInt(numStr) : undefined;
};

//

export interface CsvTransaction {
  id: number;
  date: string;
  amount: number;
  accountNo: string;
  desc: string;
  total: number;
  currency: string;
}

export const parseCsv = (
  text: string,
  headingMappings: Record<string, string>
) => {
  const [header, ...lines] = text.split('\n');

  const headings = header.split(';').map((h) => h.trim());

  return lines.sort().reduce((acc, line, index) => {
    const columns = line.split(';');

    const get = (key: keyof typeof headingMappings) => {
      const index = headings.indexOf(headingMappings[key]);

      if (index === -1) {
        if (!headingMappings[key]) {
          throw new Error(
            `[parseCsv]: No matching heading mapping found for ${key}`
          );
        } else {
          throw new Error(
            `[parseCsv]: Mapping ${headingMappings[key]} for ${key} not found in header of csv: ${header}`
          );
        }
      }

      return columns[index];
    };

    try {
      return [
        ...acc,
        {
          date: get('date').replace(/\//g, '-'),
          amount: C.parseNum(get('amount')),
          total: C.parseNum(get('total')),
          desc:
            (get('name') ? get('name') + ' - ' : '') +
            get('desc').replace(/Kortköp\ [0-9]{6,6}\ /g, ''),
          accountNo: get('from') || get('to'),
          currency: get('currency'),
          id: getCsvEntryId(line),
        } as CsvTransaction,
      ];
    } catch (e) {
      throw new Error(
        'Failed to parse csv line (#' + index + '): ' + line + '\n' + e
      );
    }
  }, [] as CsvTransaction[]);
};
