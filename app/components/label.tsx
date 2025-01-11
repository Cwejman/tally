import * as C from '~/utils/common';
import {ReactNode} from "react";

const variants = {
  default: 'bg-white border border-gray-200',
  'default-heavy': 'bg-white font-medium border border-gray-400/30',
  muted: 'bg-gray-50 border border-gray-300/80',
  dark: 'bg-gray-600 text-gray-50 border border-gray-600 font-normal',
};

export type LabelVariants = keyof typeof variants;

export interface LabelProps {
  variant?: LabelVariants;
  icon?: string | null;
  rightIcon?: ReactNode;
  amount?: number;
  label: string;
}

export const Label = ({
  variant = 'default',
  icon,
  rightIcon,
  amount,
  label,
}: LabelProps) => {
  const [int, dig] = amount ? C.spacedNum(C.twoDigNum(amount)).split('.') : [];

  return (
    <div className={`inline-flex rounded-md ${variants[variant]}`}>
      {amount !== undefined && (
        <div className="px-2 py-1 font-medium border-r border-gray-400/30">
          {int}
          <span className="font-normal opacity-90"> SEK</span>
        </div>
      )}
      <div className="px-2 py-1">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </div>
      {rightIcon && (
        <div className="flex items-center border-l border-gray-400/30 justify-center w-9">
          {rightIcon}
        </div>
      )}
    </div>
  );
};
