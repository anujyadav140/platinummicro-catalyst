'use client';

/**
 * pm-lists-store
 * --------------
 * Saved-list state for the /dev/preview surface. Persists to localStorage
 * under `pm-lists-v1` so lists survive reloads without needing a BC
 * round-trip.
 *
 * Why localStorage and not BC's wishlist mutations:
 *   - Works for signed-out browsing too (lists migrate cleanly to the BC
 *     wishlist API on first sign-in once that path is wired).
 *   - No server round-trip on every "Add to List" click — the dropdown
 *     can render existing lists instantly.
 *   - Catalyst's BC wishlist mutations need a customerAccessToken and a
 *     bunch of extra plumbing we don't have yet; this gets the feature
 *     to the user immediately.
 *
 * Migration path: when BC wishlists land, we'll add a one-time sync on
 * sign-in that POSTs any local lists into BC and switches reads/writes
 * to the BC API. The hook surface stays the same — components consuming
 * `usePmLists()` won't change.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'pm-lists-v1';

export interface PmListItem {
  /** SKU is the dedupe key inside a list */
  sku: string;
  qty: number;
  title?: string;
  imageUrl?: string;
  brand?: string;
  unitPrice?: string;
  /** Where to link back to from the list detail view */
  href?: string;
  /** ms timestamp the item was added */
  addedAt: number;
}

export interface PmList {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  items: PmListItem[];
}

interface PmListsState {
  lists: PmList[];
  /** False until the localStorage hydration completes — guards SSR/hydration mismatch */
  ready: boolean;
  totalListsCount: number;
  /** Total items across all lists (for the sidebar badge) */
  totalItemsCount: number;

  createList: (name: string) => PmList;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  /** Adds an item; if the SKU already exists in the list, increments qty instead */
  addItemToList: (listId: string, item: Omit<PmListItem, 'addedAt'>) => void;
  removeItemFromList: (listId: string, sku: string) => void;
  setItemQty: (listId: string, sku: string, qty: number) => void;
  getList: (id: string) => PmList | undefined;
}

const PmListsContext = createContext<PmListsState | null>(null);

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadFromStorage(): PmList[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Defensive: filter out malformed entries from any stale shape.
    return parsed.filter(
      (l): l is PmList =>
        l != null &&
        typeof l === 'object' &&
        typeof (l as PmList).id === 'string' &&
        typeof (l as PmList).name === 'string' &&
        Array.isArray((l as PmList).items),
    );
  } catch {
    return [];
  }
}

function saveToStorage(lists: PmList[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  } catch {
    // quota exceeded or storage disabled — non-fatal, ignore
  }
}

export function PmListsProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<PmList[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage after mount so SSR markup doesn't try to
  // depend on browser-only state.
  useEffect(() => {
    setLists(loadFromStorage());
    setReady(true);
  }, []);

  // Persist after every change once hydrated.
  useEffect(() => {
    if (ready) saveToStorage(lists);
  }, [lists, ready]);

  const createList = useCallback((name: string): PmList => {
    const trimmed = name.trim() || 'Untitled list';
    const now = Date.now();
    const list: PmList = {
      id: generateId(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      items: [],
    };
    setLists((prev) => [list, ...prev]);
    return list;
  }, []);

  const renameList = useCallback((id: string, name: string) => {
    const trimmed = name.trim() || 'Untitled list';
    setLists((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, name: trimmed, updatedAt: Date.now() } : l,
      ),
    );
  }, []);

  const deleteList = useCallback((id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const addItemToList = useCallback(
    (listId: string, item: Omit<PmListItem, 'addedAt'>) => {
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          const existing = l.items.find((i) => i.sku === item.sku);
          const items = existing
            ? l.items.map((i) =>
                i.sku === item.sku
                  ? { ...i, qty: i.qty + Math.max(1, item.qty) }
                  : i,
              )
            : [
                ...l.items,
                { ...item, qty: Math.max(1, item.qty), addedAt: Date.now() },
              ];
          return { ...l, items, updatedAt: Date.now() };
        }),
      );
    },
    [],
  );

  const removeItemFromList = useCallback((listId: string, sku: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? {
              ...l,
              items: l.items.filter((i) => i.sku !== sku),
              updatedAt: Date.now(),
            }
          : l,
      ),
    );
  }, []);

  const setItemQty = useCallback(
    (listId: string, sku: string, qty: number) => {
      const safeQty = Math.max(1, Math.floor(qty) || 1);
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
                ...l,
                items: l.items.map((i) =>
                  i.sku === sku ? { ...i, qty: safeQty } : i,
                ),
                updatedAt: Date.now(),
              }
            : l,
        ),
      );
    },
    [],
  );

  const getList = useCallback(
    (id: string) => lists.find((l) => l.id === id),
    [lists],
  );

  const value = useMemo<PmListsState>(
    () => ({
      lists,
      ready,
      totalListsCount: lists.length,
      totalItemsCount: lists.reduce((sum, l) => sum + l.items.length, 0),
      createList,
      renameList,
      deleteList,
      addItemToList,
      removeItemFromList,
      setItemQty,
      getList,
    }),
    [
      lists,
      ready,
      createList,
      renameList,
      deleteList,
      addItemToList,
      removeItemFromList,
      setItemQty,
      getList,
    ],
  );

  return (
    <PmListsContext.Provider value={value}>{children}</PmListsContext.Provider>
  );
}

export function usePmLists(): PmListsState {
  const ctx = useContext(PmListsContext);
  if (!ctx) {
    throw new Error('usePmLists must be used within <PmListsProvider>');
  }
  return ctx;
}
