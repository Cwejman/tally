import fs from 'fs/promises';
import path from 'path';

/**
 * Represents the structure of the directory object.
 */
export type DirectoryObject<T> = {
  [key: string]: T | DirectoryObject<T>;
};

/**
 * Recursively reads a directory and builds an object of file contents.
 * @param dirPath - The directory path to read.
 * @param transform - A function to transform file content, receiving the file name and content.
 * @returns A Promise resolving to an object representing the directory structure.
 */
export const readDirAsObj = async <T>(
  dirPath: string,
  transform: (content: string, fileName: string, path: string) => T = (
    content
  ) => content as unknown as T
): Promise<DirectoryObject<T>> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const results = await Promise.all(
    entries.map(async (entry): Promise<DirectoryObject<T> | null> => {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively process directories
        const nested = await readDirAsObj(entryPath, transform);
        return { [entry.name]: nested };
      } else if (entry.isFile()) {
        // Remove the file extension from the key
        const fileName = path.basename(entry.name, path.extname(entry.name));

        // Read the file and transform it
        const content = await fs.readFile(entryPath, 'utf-8');
        const result = transform(content, entry.name, entry.path);

        return result && { [fileName]: result };
      }
      return null; // Skip unsupported entries
    })
  );

  // Reduce the array of objects into a single object
  return results.reduce<DirectoryObject<T>>((acc, item) => {
    if (item) {
      Object.assign(acc, item);
    }
    return acc;
  }, {});
};

/**
 * Reads a directory and returns a flat list of transformed file contents.
 *
 * @template T - The type of the transformed file content.
 * @param dirPath - The path to the directory to read.
 * @param transform - A function to transform the content of each file.
 *                    Defaults to returning the raw file content as `T`.
 * @returns A promise that resolves to a list of transformed file contents.
 */

export const readDirAsList = async <T>(
  dirPath: string,
  transform: (
    content: string,
    fileName: string,
    filePath: string
  ) => T | null = (content) => content as unknown as T
): Promise<T[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const results = await Promise.all(
    entries.map(async (entry): Promise<T[] | null> => {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively process directories
        return await readDirAsList(entryPath, transform);
      } else if (entry.isFile()) {
        // Read the file and transform it
        const content = await fs.readFile(entryPath, 'utf-8');
        const result = transform(content, entry.name, entryPath);

        if (result) return [result];
      }
      return null; // Skip unsupported entries
    })
  );

  // Flatten the results into a single array
  return results.flat().filter(Boolean) as T[];
};

//

export const updateFile = async (
  path: string,
  updateFn: (input: string) => string
) => {
  const file = await fs.readFile(path, 'utf-8');
  return fs.writeFile(path, updateFn(file));
};
