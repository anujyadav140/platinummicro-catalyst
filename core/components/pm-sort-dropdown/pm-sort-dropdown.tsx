'use client';

/**
 * PmSortDropdown
 * --------------
 * Custom button + popover sort selector for the category listing header.
 * Replaces the native <select> so we control look and feel.
 *
 * Updates the `sort` URL query param via Next.js router.replace so the
 * server re-fetches with the new ordering. Other query params are preserved
 * EXCEPT `page` — sorting always resets to page 1.
 *
 * Eight options, fixed order:
 *   featured | newest | best-selling | a-z | z-a | by-review
 *   | price-asc | price-desc
 *
 * Keyboard:
 *   - Esc closes the popover
 *   - Enter on an option selects it
 *   - Arrow keys move focus
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Check } from 'lucide-react';

export interface PmSortOption {
  value: string;
  label: string;
}

const DEFAULT_OPTIONS: PmSortOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'a-z', label: 'A to Z' },
  { value: 'z-a', label: 'Z to A' },
  { value: 'by-review', label: 'By review' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

export interface PmSortDropdownProps {
  options?: PmSortOption[];
  paramName?: string;
}

export function PmSortDropdown({
  options = DEFAULT_OPTIONS,
  paramName = 'sort',
}: PmSortDropdownProps) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params?.get(paramName) ?? 'featured';

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(0, options.findIndex((o) => o.value === current)),
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const currentOption =
    options.find((o) => o.value === current) ?? options[0];

  const select = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params?.toString() ?? '');
      if (value === 'featured') {
        next.delete(paramName);
      } else {
        next.set(paramName, value);
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

  useEffect(() => {
    if (open) {
      const idx = Math.max(0, options.findIndex((o) => o.value === current));
      setActiveIndex(idx);
      // Defer focus so the popover is in the DOM
      requestAnimationFrame(() => {
        itemRefs.current[idx]?.focus();
      });
    }
  }, [open, options, current]);

  const handleListKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (activeIndex + 1) % options.length;
      setActiveIndex(nextIdx);
      itemRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (activeIndex - 1 + options.length) % options.length;
      setActiveIndex(prevIdx);
      itemRefs.current[prevIdx]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = options.length - 1;
      setActiveIndex(last);
      itemRefs.current[last]?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 sm:flex-none">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-pm-ink-300 bg-white px-3 text-sm font-semibold text-pm-ink-900 outline-none transition-colors hover:border-pm-ink-400 focus-visible:border-pm-navy-light focus-visible:shadow-[0_0_0_3px_rgba(46,109,180,0.15)] sm:h-10 sm:w-auto sm:min-w-[180px] sm:px-4"
      >
        <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-pm-ink-500">
          Sort
        </span>
        <span>{currentOption?.label ?? 'Featured'}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`text-pm-ink-500 transition-transform duration-[180ms] ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Sort by"
          tabIndex={-1}
          onKeyDown={handleListKey}
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-full overflow-hidden rounded-md border border-pm-ink-200 bg-white shadow-lg"
        >
          <ul className="flex flex-col py-1">
            {options.map((opt, idx) => {
              const selected = opt.value === current;
              return (
                <li key={opt.value}>
                  <button
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => select(opt.value)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm outline-none transition-colors ${
                      selected
                        ? 'font-semibold text-pm-navy-deep'
                        : 'text-pm-ink-700'
                    } ${
                      activeIndex === idx ? 'bg-pm-ink-100' : 'bg-white'
                    } hover:bg-pm-ink-100 focus-visible:bg-pm-ink-100`}
                  >
                    <span>{opt.label}</span>
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
