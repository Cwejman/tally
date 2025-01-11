import * as C from '~/utils/common';

const styles = {
  default: 'bg-gray-50 border border-gray-200',
  slate: 'bg-gray-100 border border-gray-100',
  dark: 'bg-gray-600 text-gray-50 border border-gray-600 font-normal',
  outline: 'border border-gray-400/30',
  'outline-heavy': 'font-medium border border-gray-400/30',
};

export interface LabelProps {
  style?: keyof typeof styles;
  icon?: string | null;
  amount?: number;
  label: string;
}

export const Label = ({
  style = 'default',
  icon,
  amount,
  label,
}: LabelProps) => {
  const [int, dig] = amount ? C.spacedNum(C.twoDigNum(amount)).split('.') : [];

  return (
    <div className={`inline-flex rounded-md ${styles[style]}`}>
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
    </div>
  );
};
