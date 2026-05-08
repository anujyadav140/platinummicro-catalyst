'use client';

/**
 * PmViewToggle
 * ------------
 * Two-button segmented control for switching between grid and list views
 * on the category listing page. Updates the `view` URL param so the server
 * re-renders with the appropriate product layout.
 *
 * `view=grid` (default) renders <PmProductCard> in a 3-up grid.
 * `view=list` renders <PmProductRow> stacked.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List } from 'lucide-react';

export type PmViewMode = 'grid' | 'list';

export interface PmViewToggleProps {
  paramName?: string;
}

export function PmViewToggle({ paramName = 'view' }: PmViewToggleProps) {
  const router = useRouter();
  const params = useSearchParams();
  const current: PmViewMode =
    (params?.get(paramName) as PmViewMode) === 'list' ? 'list' : 'grid';

  const setView = (mode: PmViewMode) => {
    if (mode === current) return;
    const next = new URLSearchParams(params?.toString() ?? '');
    if (mode === 'grid') {
      next.delete(paramName);
    } else {
      next.set(paramName, mode);
    }
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  };

  return (
    <div
      role="group"
      aria-label="Product view"
      className="inline-flex h-10 items-center rounded-md border border-pm-ink-300 bg-white p-0.5"
    >
      <ViewButton
        active={current === 'grid'}
        onClick={() => setView('grid')}
        ariaLabel="Grid view"
      >
        <LayoutGrid size={16} strokeWidth={2} />
      </ViewButton>
      <ViewButton
        active={current === 'list'}
        onClick={() => setView('list')}
        ariaLabel="List view"
      >
        <List size={16} strokeWidth={2} />
      </ViewButton>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[5px] outline-none transition-colors ${
        active
          ? 'bg-pm-navy-deep text-white'
          : 'bg-transparent text-pm-ink-500 hover:bg-pm-ink-100 hover:text-pm-ink-900'
      } focus-visible:shadow-[0_0_0_2px_rgba(46,109,180,0.3)]`}
    >
      {children}
    </button>
  );
}
