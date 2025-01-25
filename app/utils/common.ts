export const absMod = (m: number, n = 0) => ((n % m) + m) % m;

export const parseNum = (numStr: string) =>
  Number.parseFloat(numStr.replace(',', '.'));

export const twoDigNum = (num: number) =>
  (num < 0 ? '-' : ' ') + Math.abs(num).toFixed(2);

export const spacedNum = (num: string) =>
  num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const fuzzyIncludes = (a: string, b: string) =>
  a.toLowerCase().includes(b.toLowerCase());

export const toTitleCase = (phrase: string) =>
  phrase
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.toLowerCase().slice(1))
    .join(' ');

export const uniq = <T>(list: T[]): T[] =>
  list.reduce<T[]>(
    (acc, val) => (acc.indexOf(val) === -1 ? [...acc, val] : acc),
    []
  );

export const flattenObject = (obj: Record<string, any>): any[] =>
  Object.values(obj).reduce(
    (acc, val) =>
      typeof val === 'object' && val !== null
        ? acc.concat(flattenObject(val)) // Recursively flatten
        : acc.concat(val), // Add non-object value
    [] as any[] // Initialize accumulator as an empty array
  );

//

type MapObjFn<T, U> = (value: T, key: string) => U;

export const mapObj = <T, U>(
  obj: Record<string, T>,
  fn: MapObjFn<T, U>
): Record<string, U> => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, fn(value, key)])
  );
};

//

/**
 * Deeply compares two values to determine if they are equal.
 * - Fields explicitly set to `undefined` are treated the same as missing fields.
 * - Supports nested objects, arrays, and primitive values.
 *
 * @param obj1 - The first object or array to compare.
 * @param obj2 - The second object or array to compare.
 * @returns `true` if the objects/arrays are deeply equal, `false` otherwise.
 */
export const deepCompare = (obj1: any, obj2: any): boolean => {
  // Strict equality check for primitive values and functions
  if (obj1 === obj2) {
    return true;
  }

  // Handle null and undefined explicitly
  if (obj1 === null || obj2 === null) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  // Handle arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false;
    }
    return obj1.every((item, index) => deepCompare(item, obj2[index]));
  }

  // Handle objects
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    // Include keys that might exist as `undefined` or are missing
    const allKeys = new Set([...keys1, ...keys2]);

    return Array.from(allKeys).every((key) => {
      // Treat undefined and non-existent fields as equivalent
      return deepCompare(obj1[key], obj2[key]);
    });
  }

  // Fallback for other types (e.g., mismatched arrays or objects)
  return false;
};

//

export const groupBy = <T, K extends keyof any>(
  array: T[],
  getKey: (element: T) => K
): Record<K, T[]> =>
  array.reduce(
    (result, element) => {
      const key = getKey(element);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(element);
      return result;
    },
    {} as Record<K, T[]>
  );
