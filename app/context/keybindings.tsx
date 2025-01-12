import {
  createContext,
  Fragment,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useKeyPress } from '~/hooks/useKeypress';
import * as C from '~/utils/common';

export type KeyBinding = [key: string, desc: string, fn: () => void];
export type KeyBindingsMap = Record<string, KeyBinding[] | string>;

export type KeyBindingNoFn = [key: string, desc: string];
export type KeyBindingsMapNoFn = Record<string, KeyBindingNoFn[] | string>;
//

interface KeyBindingsContextValue {
  mapKey: string | null;
  setMapKey: (mapKey: string | null) => void;
  sendBindingsMap: (bindingsMap: KeyBindingsMap) => void;
}

const KeyBindingsContext = createContext<KeyBindingsContextValue | null>(null);

//

const useKeyBindingsContext = () => {
  const context = useContext(KeyBindingsContext);

  if (!context) throw new Error('KeybindingsProvider not found by hook');

  return context;
};

export const useRegisterKeyBindings = (bindingsMap: KeyBindingsMap) => {
  const { mapKey, sendBindingsMap } = useKeyBindingsContext();

  useKeyPress(
    (pressedKey) => {
      if (mapKey && Array.isArray(bindingsMap[mapKey])) {
        const binding = bindingsMap[mapKey].find(([key]) => key === pressedKey);
        console.log(
          'Key press [%s] matched binding: [%s]',
          pressedKey,
          binding?.[1]
        );
        (binding?.[2] as () => void)?.();
      }
    },
    [bindingsMap]
  );

  useEffect(() => {
    return sendBindingsMap(bindingsMap);
  }, [bindingsMap]);
};

export const useRequestKeyBindings = (mapKey: string | null) => {
  const { setMapKey } = useKeyBindingsContext();

  // Without dependencies so that it always get the correct createRequest
  useEffect(() => {
    mapKey && setMapKey(mapKey);
  }, [mapKey]);
};

//

export interface KeybindingsProviderProps {
  children: ReactNode;
}

const customKeys = {
  ArrowDown: '↓',
  ArrowUp: '↑',
  Enter: '↵',
  Escape: 'esc',
};

export const KeybindingsProvider = ({ children }: KeybindingsProviderProps) => {
  const [mapKey, setMapKey] = useState<string | null>(null);
  const [bindingsMap, setBindingsMap] = useState<KeyBindingsMapNoFn>({});

  const sendBindingsMap = (input: KeyBindingsMap) => {
    const inputNoFn = C.mapObj(input, (inputBindings) =>
      Array.isArray(inputBindings)
        ? inputBindings.map((inputBinding) => inputBinding.slice(0, 2))
        : inputBindings
    );

    setBindingsMap((current) => {
      const hasChanges = Object.entries(inputNoFn).some(
        ([inputMapKey, inputBindings]) =>
          !C.deepCompare(inputBindings, current[inputMapKey])
      );

      return hasChanges
        ? ({ ...current, ...inputNoFn } as KeyBindingsMapNoFn)
        : current;
    });
  };

  const bindings = mapKey && bindingsMap[mapKey];

  return (
    <KeyBindingsContext.Provider value={{ mapKey, setMapKey, sendBindingsMap }}>
      {children}
      <div
        className={
          'fixed inset-0 flex flex-col justify-end items-center transition-opacity' +
          'bg-gradient-to-t from-black/15 pointer-events-none ' +
          (bindings ? 'opacity-100' : 'opacity-0')
        }
      >
        <div className="mb-4 py-2 px-5 flex gap-3 items-center rounded-full border text-sm bg-blue-50 border-blue-300 shadow-lg">
          {typeof bindings === 'string'
            ? bindings
            : bindings?.map(([key, desc]) => (
                <Fragment key={key}>
                  <div>{desc}</div>
                  <div className="-ml-1.5 border border-gray-300 bg-white text-xs rounded-md px-1 h-5 flex items-center justify-center text-gray-500">
                    {customKeys[key as keyof typeof customKeys] ?? key}
                  </div>
                </Fragment>
              ))}
        </div>
      </div>
    </KeyBindingsContext.Provider>
  );
};
