import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white dark:bg-dark-800/90 p-4 shadow-sm border border-slate-200/80 dark:border-dark-700/60 transition-colors',
        className
      )}
      {...props}
    />
  );
}

type Variant = 'primary' | 'success' | 'danger' | 'ghost' | 'outline' | 'warn';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-dark-950 font-black hover:bg-brand-hover active:scale-[0.98] shadow-md shadow-brand/20',
  success: 'bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:scale-[0.98] shadow-md shadow-emerald-500/20',
  danger: 'bg-red-500 text-white font-bold hover:bg-red-600 active:scale-[0.98] shadow-md shadow-red-500/20',
  ghost: 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98]',
  outline: 'border border-slate-300 dark:border-dark-600 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.98]',
  warn: 'bg-amber-500 text-dark-950 font-bold hover:bg-amber-600 active:scale-[0.98] shadow-md shadow-amber-500/20'
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-xl',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-3 text-sm rounded-2xl',
  xl: 'px-6 py-4 text-base rounded-2xl'
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  full?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center justify-center gap-2',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-dark-700/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-dark-600',
        className
      )}
      {...props}
    />
  );
}

export function SectionTitle({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400', className)}>
      {children}
    </h2>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent = 'text-slate-900 dark:text-slate-100'
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-100/80 dark:bg-dark-800/80 border border-slate-200/60 dark:border-dark-700/60 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn('mt-0.5 text-lg font-black tabular-nums', accent)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{sub}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  barClassName
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-dark-700', className)}>
      <div
        className={cn('h-full rounded-full bg-brand transition-all', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="text-slate-400 dark:text-slate-500">{icon}</div>
      <div className="text-sm font-bold text-slate-900 dark:text-slate-200">{title}</div>
      {description && <div className="max-w-[260px] text-xs text-slate-500 dark:text-slate-400">{description}</div>}
    </div>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function inputClass(className?: string) {
  return cn(
    'w-full rounded-xl border border-slate-300 dark:border-dark-700 bg-slate-50 dark:bg-dark-900/80 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400 dark:placeholder:text-slate-500',
    className
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass(className)} {...props} />;
}
