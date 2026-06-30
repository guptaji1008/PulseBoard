import { initials } from '../lib/ui';

export default function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand ${dims}`}
    >
      {initials(name)}
    </span>
  );
}
