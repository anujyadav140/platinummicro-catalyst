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
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';

import { usePmLists, type PmListItem } from '~/lib/pm-lists-store';

export interface PmAddToListButtonProps {
  /** Item we'll push into the chosen list. addedAt is filled by the store. */
  item: Omit<PmListItem, 'addedAt'>;
  /** Override the default trigger styling (full-width outline). */
  className?: string;
}

const ADDED_FEEDBACK_MS = 800;

export function PmAddToListButton({
  item,
  className,
}: PmAddToListButtonProps) {
  const { lists, ready, createList, addItemToList } = usePmLists();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [recentlyAddedListId, setRecentlyAddedListId] = useState<
    string | null
  >(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Click outside + Escape closes.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const wrapper = wrapperRef.current;
      if (wrapper && !wrapper.contains(e.target as Node)) {
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

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          className ??
          'flex w-full items-center justify-center gap-2 rounded-md border border-pm-ink-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-ink-500 hover:bg-pm-ink-100'
        }
      >
        <Plus size={14} strokeWidth={2.5} />
        Add to List
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`opacity-60 transition-transform duration-[120ms] ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-[300px] overflow-hidden rounded-md border border-pm-ink-200 bg-white shadow-lg"
        >
          <div className="border-b border-pm-ink-200 px-4 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-pm-tan">
              Add to a list
            </div>
          </div>

          {!ready ? (
            <div className="px-4 py-4 text-[13px] text-pm-ink-500">
              Loading…
            </div>
          ) : lists.length === 0 ? (
            <div className="px-4 py-4 text-[13px] leading-[1.5] text-pm-ink-500">
              No saved lists yet. Create one below to get started.
            </div>
          ) : (
            <ul className="max-h-[260px] overflow-y-auto py-1">
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
      )}
    </div>
  );
}
