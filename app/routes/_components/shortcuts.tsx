import { Fragment } from 'react';

export type KeyBinding = [key: string, desc: string, fn: () => void];

export interface ShortcutsProps {
  data?: string | KeyBinding[];
}

const customKeys = {
  ArrowDown: '↓',
  Escape: 'esc',
};

export const Shortcuts = ({ data }: ShortcutsProps) => (
  <div
    className={
      'fixed inset-0 flex flex-col justify-end items-center transition-opacity' +
      'bg-gradient-to-t from-black/15 pointer-events-none ' +
      (data ? 'opacity-100' : 'opacity-0')
    }
  >
    <div className="mb-4 py-2 px-5 flex gap-3 items-center rounded-full border text-sm bg-blue-50 border-blue-300 shadow-lg">
      {Array.isArray(data)
        ? data.map(([key, desc]) => (
            <Fragment key={key}>
              <div>{desc}</div>
              <div className="-ml-1.5 border border-gray-300 bg-white text-xs rounded-md px-1 h-5 flex items-center justify-center text-gray-500">
                {customKeys[key as keyof typeof customKeys] ?? key}
              </div>
            </Fragment>
          ))
        : data}
    </div>
  </div>
);
