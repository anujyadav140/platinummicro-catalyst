'use client';

/**
 * PmPageSize
 * ----------
 * Custom button + popover selector for "products per page" on the category
 * listing page. Mirrors the look of <PmSortDropdown> so the toolbar feels
 * consistent.
 *
 * URL param `?perPage=24`. Resets `?page=1` on change.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';

export const PM_PAGE_SIZE_OPTIONS: ReadonlyArray<number> = [12, 24, 36, 48, 96];
export const PM_PAGE_SIZE_DEFAULT = 24;

export interface PmPageSizeProps {
  paramName?: string;
  options?: ReadonlyArray<number>;
}

export function PmPageSize({
  paramName = 'perPage',
  options = PM_PAGE_SIZE_OPTIONS,
}: PmPageSizeProps) {
  const router = useRouter();
  const params = useSearchParams();
  const raw = Number(params?.get(paramName));
  const current = options.includes(raw) ? raw : PM_PAGE_SIZE_DEFAULT;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const select = useCallback(
    (value: number) => {
      const next = new URLSearchParams(params?.toString() ?? '');
      if (value === PM_PAGE_SIZE_DEFAULT) {
        next.delete(paramName);
      } else {
        next.set(paramName, String(value));
      }
      next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
      setOpen(false);
      buttonRef.current?.focus();
    },
    [params, paramName, router],
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Show ${current} per page`}
        className="inline-flex h-10 min-w-[140px] items-center justify-between gap-2 rounded-md border border-pm-ink-300 bg-white px-4 text-[14px] font-semibold text-pm-ink-900 outline-none transition-colors hover:border-pm-ink-400 focus-visible:border-pm-navy-light focus-visible:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]"
      >
        <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-pm-ink-500">
          Show
        </span>
        <span>{current}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`text-pm-ink-500 transition-transform duration-[180ms] ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Products per page"
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-full overflow-hidden rounded-md border border-pm-ink-200 bg-white shadow-lg"
        >
          <ul className="flex flex-col py-1">
            {options.map((opt) => {
              const selected = opt === current;
              return (
                <li key={opt}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(opt)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm outline-none transition-colors ${
                      selected
                        ? 'font-semibold text-pm-navy-deep'
                        : 'text-pm-ink-700'
                    } hover:bg-pm-ink-100 focus-visible:bg-pm-ink-100`}
                  >
                    <span>{opt} per page</span>
                    {selected && (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="text-pm-terracotta"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
