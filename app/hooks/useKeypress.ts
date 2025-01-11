import { useEffect } from 'react';

type KeyPressCallback = (key: string, event: KeyboardEvent) => void;

export const useKeyPress = (
  callback: KeyPressCallback,
  dependencies: any[]
) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      callback(event.key, event); // Trigger the callback with the key and the event
    };

    window.addEventListener('keydown', handleKeyPress as EventListener);

    return () => {
      window.removeEventListener('keydown', handleKeyPress as EventListener);
    };
  }, dependencies);
};
