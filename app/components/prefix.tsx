import React from 'react';

export type PrefixStr = '!' | '@' | '*';

export interface PrefixProps {
  prefix?: PrefixStr;
}

export const Prefix = ({ prefix }: PrefixProps) =>
  prefix === '!' ? (
    <div className="rounded-full bg-yellow-500 w-5 h-5 flex items-center justify-center text-xs font-medium text-white">
      !
    </div>
  ) : prefix === '@' ? (
    <div className="rounded-full bg-red-500/95 w-5 h-5 flex items-center justify-center text-xs text-white">
      <span className="mt-[-1px]">@</span>
    </div>
  ) : null;
