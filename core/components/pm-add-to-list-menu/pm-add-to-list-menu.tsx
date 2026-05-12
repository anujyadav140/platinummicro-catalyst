'use client';

/**
 * PmAddToListButton
 * -----------------
 * Drop-in replacement for the previous "Add to List" stub on PDP. Shows
 * a Plus + ChevronDown trigger; click to open a dropdown panel:
 *
 *   - Top: small "Add to a list" eyebrow
 *   - Middle: scrollable list of existing lists. Click a list to add the
 *     current item to it. Inline checkmark animates in for ~800ms after
 *     a successful add.
 *   - Bottom: "Create new list" affordance — clicking expands an inline
 *     text input + Cancel/Create-and-add buttons. Submitting both creates
 *     the list AND adds the current item to it in one action.
 *
 * Dedup: addItemToList in the store already handles the "this SKU is
 * already in this list" case by incrementing qty.
 *
 * Click-outside + Escape both close the popover.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Star } from 'lucide-react';

import { usePmLists, type PmListItem } from '~/lib/pm-lists-store';

export interface PmAddToListButtonProps {
  /** Item we'll push into the chosen list. addedAt is filled by the store. */
  item: Omit<PmListItem, 'addedAt'>;
  /** Override the default trigger styling (full-width outline). */
  className?: string;
  /** Visible label inside the trigger. Default "Add to List". */
  label?: string;
  /** Icon node rendered alongside the label. Default <Plus />. */
  icon?: ReactNode;
  /** Position of the icon relative to the label. Default "left". */
  iconPosition?: 'left' | 'right';
  /** Show the small chevron hinting at the dropdown. Default true. */
  showChevron?: boolean;
}

const ADDED_FEEDBACK_MS = 800;

export function PmAddToListButton({
  item,
  className,
  label = 'Add to List',
  icon,
  iconPosition = 'left',
  showChevron = true,
}: PmAddToListButtonProps) {
  const { lists, ready, createList, addItemToList } = usePmLists();

  // Check if this SKU already exists in any list
  const isInAnyList = lists.some((list) =>
    list.items.some((i) => i.sku === item.sku),
  );

  const triggerIcon = isInAnyList
    ? <Star size={14} strokeWidth={0} fill="currentColor" />
    : (icon ?? <Plus size={14} strokeWidth={2.5} />);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [recentlyAddedListId, setRecentlyAddedListId] = useState<
    string | null
  >(null);
  // Pixel coords for the portal-rendered popover, recomputed every
  // time it opens / on scroll / on resize. `null` = not yet measured.
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // ── Portal positioning ────────────────────────────────────────────
  // The popover is rendered into document.body to escape the product
  // row's stacking context (two adjacent rows would otherwise paint
  // their content on top of each other's popovers). Position is
  // measured from the trigger button on every open / scroll / resize.
  const POPOVER_WIDTH = 300;
  const positionPopover = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    // Align the popover's right edge with the trigger's right edge so
    // it doesn't run off the viewport in narrow columns.
    const top = rect.bottom + 8; // 8px gap (mt-2 equivalent)
    const left = Math.max(8, rect.right - POPOVER_WIDTH);
    setPopoverPos({ top, left, width: POPOVER_WIDTH });
  };

  useLayoutEffect(() => {
    if (!open) return;
    positionPopover();
    const onReflow = () => positionPopover();
    window.addEventListener('scroll', onReflow, true); // capture scrolls in any ancestor
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open]);

  // Click outside + Escape closes. Outside = neither the trigger nor
  // the portal-rendered popover.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = wrapperRef.current?.contains(target);
      const insidePopover = popoverRef.current?.contains(target);
      if (!insideTrigger && !insidePopover) {
        setOpen(false);
        setCreating(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const flashAdded = (listId: string) => {
    setRecentlyAddedListId(listId);
    setTimeout(() => {
      setRecentlyAddedListId(null);
      setOpen(false);
      setCreating(false);
    }, ADDED_FEEDBACK_MS);
  };

  const handleAdd = (listId: string) => {
    addItemToList(listId, item);
    flashAdded(listId);
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const list = createList(trimmed);
    addItemToList(list.id, item);
    setNewName('');
    flashAdded(list.id);
  };

  // Popover body — rendered into a portal so it escapes every product
  // row's local stacking context. Falls back to inline render if the
  // portal target isn't available (SSR pre-hydration).
  const popoverBody = open && popoverPos ? (
    <div
      ref={popoverRef}
      role="menu"
      style={{
        position: 'fixed',
        top: popoverPos.top,
        left: popoverPos.left,
        width: popoverPos.width,
      }}
      className="z-[1000] overflow-hidden rounded-md border border-pm-ink-200 bg-white shadow-lg"
    >
      <div className="border-b border-pm-ink-200 px-4 py-2.5">
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-pm-tan">
          Add to a list
        </div>
      </div>

      {!ready ? (
        <div className="px-4 py-4 text-[13px] text-pm-ink-500">Loading…</div>
      ) : lists.length === 0 ? (
        <div className="px-4 py-4 text-[13px] leading-[1.5] text-pm-ink-500">
          No saved lists yet. Create one below to get started.
        </div>
      ) : (
        <ul
          // Cap at ~3 rows tall (each row is ~56px including py-2.5) so the
          // popover stays compact and the scroll affordance is obvious the
          // moment the user has 4+ lists. "Create new list" sits OUTSIDE
          // this ul, so it's always pinned at the bottom of the popover.
          className="max-h-[168px] overflow-y-auto py-1"
        >
          {lists.map((list) => {
            const justAdded = recentlyAddedListId === list.id;
            return (
              <li key={list.id}>
                <button
                  type="button"
                  onClick={() => handleAdd(list.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-pm-ink-100"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-[13px] font-semibold text-pm-ink-900">
                      {list.name}
                    </span>
                    <span className="ml-2 text-[12px] text-pm-ink-500">
                      {list.items.length}{' '}
                      {list.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </span>
                  {justAdded ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-pm-success">
                      <Check size={14} strokeWidth={2.5} />
                      Added
                    </span>
                  ) : (
                    <Plus
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 text-pm-ink-400"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Create-new-list footer */}
      <div className="border-t border-pm-ink-200 bg-pm-paper px-4 py-3">
        {creating ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              /* eslint-disable-next-line jsx-a11y/no-autofocus -- intentional UX inside an opened popover */
              autoFocus
              maxLength={64}
              placeholder="List name (e.g. Server build)"
              className="rounded-md border border-pm-ink-300 bg-white px-3 py-2 text-[13px] text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewName('');
                }}
                className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-pm-terracotta px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={12} strokeWidth={2.5} />
                Create &amp; add
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-pm-navy-mid transition-colors hover:text-pm-navy-deep"
          >
            <Plus size={14} strokeWidth={2.5} />
            Create new list
          </button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          // Outer card may wrap the row in a Link — keep the click here.
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          isInAnyList
            ? (className
                ? className
                    .replace(/border-pm-ink-300/g, 'border-pm-navy-mid/30')
                    .replace(/bg-white/g, 'bg-pm-navy-mid/5')
                    .replace(/text-pm-ink-900/g, 'text-pm-navy-mid')
                : 'flex w-full items-center justify-center gap-2 rounded-md border border-pm-navy-mid/30 bg-pm-navy-mid/5 px-4 py-2.5 text-[13px] font-semibold text-pm-navy-mid transition-colors hover:border-pm-navy-mid/50 hover:bg-pm-navy-mid/10')
            : (className ??
              'flex w-full items-center justify-center gap-2 rounded-md border border-pm-ink-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-ink-500 hover:bg-pm-ink-100')
        }
      >
        {iconPosition === 'left' && triggerIcon}
        {isInAnyList ? 'In Your List' : label}
        {iconPosition === 'right' && triggerIcon}
        {showChevron && (
          <ChevronDown
            size={12}
            strokeWidth={2}
            className={`opacity-60 transition-transform duration-[120ms] ${
              open ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {popoverBody && typeof document !== 'undefined'
        ? createPortal(popoverBody, document.body)
        : null}
    </div>
  );
}
