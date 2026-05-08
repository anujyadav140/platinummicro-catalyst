'use client';

/**
 * ListsGrid (client)
 * ------------------
 * Client side of the Lists page. Reads from `usePmLists` and renders one
 * card per saved list. Inline create flow (modal-style overlay), inline
 * rename, click-to-confirm delete.
 *
 * Why all client: the lists store is localStorage-backed and only knows
 * its state on the client. The parent server page handles auth gating
 * + chrome and just renders this component.
 */
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';

import { usePmLists } from '~/lib/pm-lists-store';

export function ListsGrid() {
  const { lists, ready, createList, renameList, deleteList } = usePmLists();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    createList(trimmed);
    setNewName('');
    setShowCreate(false);
  };

  const startRename = (id: string, current: string) => {
    setRenamingId(id);
    setRenameValue(current);
  };

  const commitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingId) {
      renameList(renamingId, renameValue);
      setRenamingId(null);
      setRenameValue('');
    }
  };

  return (
    <>
      {/* Inline create form — sits at the top of the grid when active.
          (No separate top-bar "New list" button — the dashed-card tile in
          the grid handles that, and a second button was visually redundant.) */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-md border border-pm-ink-200 bg-white p-5 shadow-sm"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-pm-tan">
              List name
            </span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              /* eslint-disable-next-line jsx-a11y/no-autofocus */
              autoFocus
              maxLength={64}
              placeholder="e.g. Server build, Q2 reorder, NASPO bid"
              className="rounded-md border border-pm-ink-300 bg-white px-3 py-2.5 text-[14px] text-pm-ink-900 outline-none transition-all focus:border-pm-navy-light focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]"
            />
          </label>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setNewName('');
              }}
              className="rounded-md px-3 py-2 text-[13px] font-semibold text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-pm-terracotta px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={13} strokeWidth={2.5} />
              Create list
            </button>
          </div>
        </form>
      )}

      {/* Empty state — shown only after hydration so we don't flash it */}
      {ready && lists.length === 0 && !showCreate && (
        <div className="flex flex-col items-center rounded-md border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center">
          <span
            aria-hidden
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pm-ink-100 text-pm-ink-500"
          >
            <ListChecks size={24} strokeWidth={1.5} />
          </span>
          <h2 className="text-[18px] font-bold tracking-tight text-pm-ink-900">
            No lists yet
          </h2>
          <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-pm-ink-500">
            Save BOMs, reorder kits, and shortlists. Add items to a list from
            any product page.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
          >
            <Plus size={14} strokeWidth={2.5} />
            Create your first list
          </button>
        </div>
      )}

      {/* Lists grid */}
      {lists.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => {
            const isRenaming = renamingId === list.id;
            const isConfirmDelete = confirmDeleteId === list.id;
            return (
              <article
                key={list.id}
                className="flex flex-col rounded-md border border-pm-ink-200 bg-white p-5 shadow-sm transition-colors hover:border-pm-ink-300"
              >
                <div className="flex items-start gap-2.5">
                  <ListChecks
                    size={16}
                    strokeWidth={1.5}
                    className="mt-0.5 shrink-0 text-pm-navy-mid"
                  />
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <form onSubmit={commitRename}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          /* eslint-disable-next-line jsx-a11y/no-autofocus */
                          autoFocus
                          maxLength={64}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setRenamingId(null);
                              setRenameValue('');
                            }
                          }}
                          className="w-full rounded-md border border-pm-navy-light bg-white px-2 py-1 text-[15px] font-semibold text-pm-ink-900 outline-none focus:shadow-[0_0_0_3px_rgba(46,109,180,0.15)]"
                        />
                      </form>
                    ) : (
                      <Link
                        href={`/dev/preview/account/lists/${list.id}`}
                        className="block truncate text-[15px] font-semibold text-pm-ink-900 hover:text-pm-navy-deep hover:underline"
                      >
                        {list.name}
                      </Link>
                    )}
                    <div className="mt-1 text-[12px] text-pm-ink-500">
                      {list.items.length}{' '}
                      {list.items.length === 1 ? 'item' : 'items'} ·{' '}
                      Updated {formatRelativeTime(list.updatedAt)}
                    </div>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="mt-5 flex items-center gap-1 border-t border-pm-ink-100 pt-4 text-[13px] font-semibold">
                  {isConfirmDelete ? (
                    <>
                      <span className="flex-1 text-[12px] text-pm-danger">
                        Delete &ldquo;{list.name}&rdquo;?
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-md px-2.5 py-1 text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteList(list.id);
                          setConfirmDeleteId(null);
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-pm-danger px-2.5 py-1 text-white transition-colors hover:bg-pm-danger/90"
                      >
                        <Trash2 size={12} strokeWidth={2} />
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startRename(list.id, list.name)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-pm-navy-mid transition-colors hover:bg-pm-navy-pale"
                      >
                        <Pencil size={12} strokeWidth={2} />
                        Rename
                      </button>
                      <span aria-hidden className="text-pm-ink-300">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(list.id)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-pm-danger transition-colors hover:bg-pm-danger-bg"
                      >
                        <Trash2 size={12} strokeWidth={2} />
                        Delete
                      </button>
                      <span className="flex-1" />
                      <Link
                        href={`/dev/preview/account/lists/${list.id}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-pm-ink-700 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
                      >
                        Open
                        <ArrowRight size={12} strokeWidth={2} />
                      </Link>
                    </>
                  )}
                </div>
              </article>
            );
          })}

          {/* Add new list tile */}
          {!showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-pm-ink-300 bg-white p-8 text-pm-ink-500 transition-colors hover:border-pm-navy-light hover:bg-pm-navy-pale hover:text-pm-navy-deep"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full bg-pm-ink-100"
              >
                <Plus size={18} strokeWidth={2} />
              </span>
              <span className="text-[14px] font-semibold">New list</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ----- helpers ----- */

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
