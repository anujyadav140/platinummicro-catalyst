'use client';

/**
 * PmCouponInput
 * -------------
 * Promo-code row used in both the cart-drawer footer and the dedicated
 * cart page summary. Customer types a code, hits Apply, we POST to
 * `/dev/preview/api/coupons/validate` (which talks to BC's REST coupons
 * endpoint) and show:
 *   - green check + summary on a valid coupon (with a Remove link to clear)
 *   - red X + reason on an invalid one
 *   - spinner while checking
 *
 * The applied coupon lives in `PmQuoteContext` (localStorage-persisted)
 * so it:
 *   - survives navigation between cart drawer ↔ cart page
 *   - is available at checkout-start time for the server-side
 *     `applyCheckoutCoupon` mutation that pushes it into the BC cart
 *   - lets the cart summary compute a discount preview row
 *
 * The transient form state (typed code, in-flight status, last error
 * reason) stays local — only the validated result is shared.
 */

import { useRef, useState, type FormEvent } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { usePmQuote } from '~/lib/pm-quote-store';
import type { PmCouponValidation } from '~/lib/pm-coupons';

type Status = 'idle' | 'loading' | 'invalid';

export function PmCouponInput() {
  const { appliedCoupon, setAppliedCoupon } = usePmQuote();

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [invalidResult, setInvalidResult] =
    useState<PmCouponValidation | null>(null);

  // Stale-request guard: cancel any in-flight check before kicking off a new one.
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'loading') return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setInvalidResult(null);

    try {
      const res = await fetch('/dev/preview/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
      const data = (await res.json()) as PmCouponValidation;

      if (controller.signal.aborted) return;

      if (data.valid) {
        setAppliedCoupon(data);
        setStatus('idle');
        setInvalidResult(null);
        setCode('');
      } else {
        setInvalidResult(data);
        setStatus('invalid');
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setInvalidResult({
        valid: false,
        code: code.trim().toUpperCase(),
        reason: 'Could not check this code right now',
      });
      setStatus('invalid');
    }
  }

  function handleRemove() {
    abortRef.current?.abort();
    setCode('');
    setInvalidResult(null);
    setStatus('idle');
    setAppliedCoupon(null);
  }

  const isLoading = status === 'loading';
  const isValid = Boolean(appliedCoupon?.valid);

  return (
    <div className="rounded-md border border-pm-ink-200 bg-pm-paper p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-pm-tan">
        Promo code
      </div>

      {isValid ? (
        <div className="mt-2 flex items-center justify-between gap-2 text-[13px]">
          <div className="flex min-w-0 items-center gap-1.5 text-pm-success">
            <Check size={14} strokeWidth={2} className="shrink-0" />
            <span className="font-semibold">{appliedCoupon?.code}</span>
            <span className="truncate text-pm-ink-700">— {appliedCoupon?.summary}</span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 text-[12px] font-medium text-pm-ink-500 underline-offset-2 hover:text-pm-ink-900 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (status === 'invalid') {
                setStatus('idle');
                setInvalidResult(null);
              }
            }}
            placeholder="Coupon code"
            maxLength={32}
            spellCheck={false}
            autoComplete="off"
            aria-label="Coupon code"
            className="w-full min-w-0 flex-1 rounded-md border border-pm-ink-200 bg-white px-3 py-2.5 sm:py-2 font-mono text-sm uppercase text-pm-ink-900 outline-none placeholder:font-sans placeholder:normal-case placeholder:text-pm-ink-400 focus:border-pm-navy-deep min-h-[44px]"
          />
          <button
            type="submit"
            disabled={isLoading || code.trim().length === 0}
            className="inline-flex w-full sm:w-auto min-h-[44px] items-center justify-center gap-1.5 rounded-md bg-pm-terracotta px-4 py-2.5 sm:py-2 text-sm font-semibold text-white transition-colors hover:bg-pm-terracotta-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                Checking…
              </>
            ) : (
              'Apply'
            )}
          </button>
        </form>
      )}

      {status === 'invalid' && invalidResult?.reason && (
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-pm-danger">
          <X size={13} strokeWidth={2} className="shrink-0" />
          <span>{invalidResult.reason}</span>
        </div>
      )}
    </div>
  );
}
