'use client';

/**
 * AddressesGrid (client)
 * ----------------------
 * BC-backed address book. The parent server page passes the customer's
 * saved addresses pulled directly from BC. This component:
 *
 *   - Renders the cards
 *   - Shows the inline AddressForm for create + edit (form action posts
 *     to the server action; on success, server revalidates this route
 *     and the parent page re-renders with fresh data)
 *   - Wires Delete via a small inline form pointing at deleteAddressAction
 *
 * No localStorage, no provider, no client-side mirror state — BC is the
 * single source of truth.
 */
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';

import { deleteAddressAction } from '../../_actions/addresses';
import type { PmBcAddress } from '~/lib/pm-customer-addresses';

import { AddressForm } from './address-form';
import { useSession } from './session-defaults';

type EditState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; addressId: number };

export interface AddressesGridProps {
  /** Addresses pulled from BC by the server entry. */
  addresses: PmBcAddress[];
}

export function AddressesGrid({ addresses }: AddressesGridProps) {
  const sessionDefaults = useSession();
  const [edit, setEdit] = useState<EditState>({ kind: 'closed' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // The first address in BC's response is the implicit default; we tag
  // it with the green DEFAULT pill. (BC's storefront API doesn't expose
  // an explicit isDefault flag — the order returned is the canonical
  // one, with the customer's primary address first.)
  const defaultAddressId = addresses[0]?.entityId;

  const editingAddress =
    edit.kind === 'edit'
      ? addresses.find((a) => a.entityId === edit.addressId)
      : undefined;

  return (
    <>
      {/* Inline form — sits at the top of the grid when active */}
      {edit.kind !== 'closed' && (
        <AddressForm
          key={edit.kind === 'edit' ? edit.addressId : 'new'}
          mode={edit.kind === 'edit' ? 'edit' : 'create'}
          addressId={edit.kind === 'edit' ? edit.addressId : undefined}
          defaults={
            edit.kind === 'edit' && editingAddress
              ? {
                  firstName: editingAddress.firstName,
                  lastName: editingAddress.lastName,
                  company: editingAddress.company,
                  street1: editingAddress.street1,
                  street2: editingAddress.street2,
                  city: editingAddress.city,
                  region: editingAddress.region,
                  postalCode: editingAddress.postalCode,
                  country: editingAddress.country,
                  phone: editingAddress.phone,
                }
              : {
                  // Pre-fill name from session for the first new address.
                  firstName: sessionDefaults.firstName,
                  lastName: sessionDefaults.lastName,
                  country: 'United States',
                }
          }
          onCancel={() => setEdit({ kind: 'closed' })}
          onSaved={() => setEdit({ kind: 'closed' })}
        />
      )}

      {/* Empty state — no BC addresses, no form open */}
      {addresses.length === 0 && edit.kind === 'closed' && (
        <div className="flex flex-col items-center rounded-md border border-dashed border-pm-ink-200 bg-white px-8 py-16 text-center">
          <span
            aria-hidden
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pm-ink-100 text-pm-ink-500"
          >
            <MapPin size={24} strokeWidth={1.5} />
          </span>
          <h2 className="text-[18px] font-bold tracking-tight text-pm-ink-900">
            No addresses on file
          </h2>
          <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-pm-ink-500">
            Save shipping and billing destinations so they auto-fill at
            checkout.
          </p>
          <button
            type="button"
            onClick={() => setEdit({ kind: 'create' })}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-pm-terracotta px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-pm-terracotta-light"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add your first address
          </button>
        </div>
      )}

      {/* Address card grid */}
      {addresses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.map((addr) => {
            const isDefault = addr.entityId === defaultAddressId;
            const isConfirmDelete = confirmDeleteId === addr.entityId;
            return (
              <article
                key={addr.entityId}
                className="flex flex-col rounded-md border border-pm-ink-200 bg-white p-5 shadow-sm transition-colors hover:border-pm-ink-300"
              >
                {isDefault && (
                  <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-pm-success-bg px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-pm-success">
                    <Star size={10} strokeWidth={2.5} />
                    Default
                  </span>
                )}

                <div className="flex items-start gap-2.5">
                  <MapPin
                    size={16}
                    strokeWidth={1.5}
                    className="mt-0.5 shrink-0 text-pm-navy-mid"
                  />
                  <div className="min-w-0 flex-1 text-[13px] leading-[1.55] text-pm-ink-700">
                    <div className="text-[14px] font-semibold text-pm-ink-900">
                      {addr.firstName} {addr.lastName}
                    </div>
                    {addr.company && (
                      <div className="text-[13px] text-pm-ink-700">
                        {addr.company}
                      </div>
                    )}
                    <div className="mt-2 text-pm-ink-700">
                      {addr.street1}
                      {addr.street2 && (
                        <>
                          <br />
                          {addr.street2}
                        </>
                      )}
                      <br />
                      {addr.city}, {addr.region} {addr.postalCode}
                      <br />
                      {addr.country}
                    </div>
                    {addr.phone && (
                      <div className="mt-2 text-[13px] text-pm-ink-500">
                        Phone: {addr.phone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-1 border-t border-pm-ink-100 pt-4 text-[13px] font-semibold">
                  {isConfirmDelete ? (
                    <DeleteConfirm
                      addressId={addr.entityId}
                      onCancel={() => setConfirmDeleteId(null)}
                      onCompleted={() => setConfirmDeleteId(null)}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setEdit({ kind: 'edit', addressId: addr.entityId })
                        }
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-pm-navy-mid transition-colors hover:bg-pm-navy-pale"
                      >
                        <Pencil size={12} strokeWidth={2} />
                        Edit
                      </button>
                      <span aria-hidden className="text-pm-ink-300">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(addr.entityId)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-pm-danger transition-colors hover:bg-pm-danger-bg"
                      >
                        <Trash2 size={12} strokeWidth={2} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}

          {/* Trailing add-new tile — only when not already creating */}
          {edit.kind !== 'create' && (
            <button
              type="button"
              onClick={() => setEdit({ kind: 'create' })}
              className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-pm-ink-300 bg-white p-8 text-pm-ink-500 transition-colors hover:border-pm-navy-light hover:bg-pm-navy-pale hover:text-pm-navy-deep"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-full bg-pm-ink-100"
              >
                <Plus size={18} strokeWidth={2} />
              </span>
              <span className="text-[14px] font-semibold">Add new address</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ============================================================================
 *  Delete confirm — small inline form posting to deleteAddressAction
 * ========================================================================== */

function DeleteConfirm({
  addressId,
  onCancel,
  onCompleted,
}: {
  addressId: number;
  onCancel: () => void;
  onCompleted: () => void;
}) {
  return (
    <form
      action={async (formData) => {
        await deleteAddressAction(null, formData);
        onCompleted();
      }}
      className="flex flex-1 items-center gap-1"
    >
      <input type="hidden" name="addressId" value={addressId} />
      <span className="flex-1 text-[12px] text-pm-danger">
        Delete this address?
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md px-2.5 py-1 text-pm-ink-500 transition-colors hover:bg-pm-ink-100 hover:text-pm-ink-900"
      >
        Cancel
      </button>
      <DeleteSubmit />
    </form>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-pm-danger px-2.5 py-1 text-white transition-colors hover:bg-pm-danger/90 disabled:opacity-60"
    >
      <Trash2 size={12} strokeWidth={2} />
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
