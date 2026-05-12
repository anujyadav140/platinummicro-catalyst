'use client';

/**
 * PmRangeSlider
 * -------------
 * Dual-handle price range slider. Two `<input type="range">` elements stacked
 * over the same track — the visual track + filled segment + thumbs are styled
 * via Tailwind utilities and a single global `<style>` block (rendered once at
 * module level via a static class — `.pm-range-input` — so the markup is
 * deterministic between SSR and hydration; using `useId()` for the scope
 * class caused intermittent hydration mismatches because the generated ID
 * depended on tree position).
 *
 * Controlled — parent owns `[low, high]` state, slider just dispatches.
 *
 * The two `<input>` elements are `pointer-events: none` so the underlying
 * track receives clicks; their `::thumb` pseudo-elements get
 * `pointer-events: auto` so users can still grab and drag.
 */

export interface PmRangeSliderProps {
  /** Lower bound of the slider range */
  min: number;
  /** Upper bound of the slider range */
  max: number;
  /** Step in absolute units (default 1) */
  step?: number;
  /** Current selection as [low, high] */
  value: [number, number];
  /** Called as either thumb is dragged. Always returns `[low, high]` ordered. */
  onChange: (next: [number, number]) => void;
  /** Label formatter for the readout above the slider (default `$N`) */
  formatLabel?: (n: number) => string;
  /** Accessible label prefix, e.g. "Price" — produces "Minimum Price" / "Maximum Price" */
  ariaPrefix?: string;
}

export function PmRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatLabel = (n) => `$${n.toLocaleString()}`,
  ariaPrefix = 'Range',
}: PmRangeSliderProps) {
  const [low, high] = value;

  const range = max - min;
  const lowPct = range > 0 ? ((low - min) / range) * 100 : 0;
  const highPct = range > 0 ? ((high - min) / range) * 100 : 100;

  const setLow = (n: number) => {
    const clamped = Math.max(min, Math.min(n, high));
    onChange([clamped, high]);
  };
  const setHigh = (n: number) => {
    const clamped = Math.min(max, Math.max(n, low));
    onChange([low, clamped]);
  };

  return (
    <div>
      {/* Readout: current low — high values */}
      <div className="mb-3 flex items-center justify-between text-[14px] font-semibold text-pm-ink-900">
        <span>{formatLabel(low)}</span>
        <span className="text-pm-ink-400">—</span>
        <span>{formatLabel(high)}</span>
      </div>

      {/* Track + thumbs */}
      <div className="relative h-6">
        {/* Inactive track */}
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-pm-ink-200" />
        {/* Active fill segment */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-pm-terracotta"
          style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }}
        />

        {/* Low thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => setLow(Number(e.target.value))}
          aria-label={`Minimum ${ariaPrefix}`}
          className="pm-range-input absolute inset-0 h-6 w-full appearance-none bg-transparent"
        />
        {/* High thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => setHigh(Number(e.target.value))}
          aria-label={`Maximum ${ariaPrefix}`}
          className="pm-range-input absolute inset-0 h-6 w-full appearance-none bg-transparent"
        />
      </div>

    </div>
  );
}

/**
 * PmRangeSliderStyles
 * -------------------
 * Static global styles for all <PmRangeSlider> instances. Rendered once
 * (typically in a layout) so the inline <style> markup is byte-identical
 * between SSR and hydration — avoiding the useId-based scoping that caused
 * hydration mismatches when the React tree shifted.
 *
 * All sliders share the same thumb styling, so a single global definition
 * is sufficient.
 */
export function PmRangeSliderStyles() {
  return (
    <style
      // eslint-disable-next-line react/no-danger -- static literal, no user input
      dangerouslySetInnerHTML={{
        __html: `
          .pm-range-input { pointer-events: none; }
          .pm-range-input::-webkit-slider-thumb {
            appearance: none;
            pointer-events: auto;
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            background: white;
            border: 2px solid var(--pm-terracotta);
            cursor: grab;
            box-shadow: 0 1px 3px rgba(7, 21, 37, 0.15);
          }
          .pm-range-input::-webkit-slider-thumb:active { cursor: grabbing; }
          .pm-range-input::-moz-range-thumb {
            appearance: none;
            pointer-events: auto;
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            background: white;
            border: 2px solid var(--pm-terracotta);
            cursor: grab;
            box-shadow: 0 1px 3px rgba(7, 21, 37, 0.15);
          }
          .pm-range-input::-moz-range-thumb:active { cursor: grabbing; }
          .pm-range-input::-moz-range-track {
            background: transparent;
          }
        `,
      }}
    />
  );
}
