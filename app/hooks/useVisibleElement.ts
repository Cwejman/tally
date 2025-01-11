import { MutableRefObject, useEffect, useRef, useState } from 'react';

type UseVisibleIndexReturn<V> = [
  visible: MutableRefObject<V | null>,
  setRef: (value: V, el: HTMLElement | null) => void,
];

export const useVisibleIndex = <V>(
  threshold: number = 0.1,
  compare: (a: V, b: V) => boolean
): UseVisibleIndexReturn<V> => {
  const visible = useRef<V | null>(null);
  const elementsRef = useRef<[value: V, el: HTMLElement | null][]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const match = elementsRef.current.find(
              ([value, el]) => el === entry.target
            );
            if (match) visible.current = match[0];
          }
        });
      },
      { root: null, threshold }
    );

    elementsRef.current.forEach(([, el]) => {
      if (el) observer.observe(el);
    });

    return () => {
      elementsRef.current.forEach(([, el]) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [threshold]);

  const setRef = (input: V, el: HTMLElement | null) => {
    console.log(input, el);
    if (el) {
      const i = elementsRef.current.findIndex(([value]) =>
        compare(value, input)
      );

      if (i !== -1) elementsRef.current[i] = [input, el];
      else elementsRef.current.push([input, el]);
    }
  };

  return [visible, setRef];
};
