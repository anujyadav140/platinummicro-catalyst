/**
 * pm-banner-parser-internal
 * -------------------------
 * Shared low-level pieces used by both the hero-banner parser
 * (`pm-hero-banner.ts`) and the card-section parser
 * (`pm-card-section.ts`). Keeps the WYSIWYG-handling logic and the
 * key/value line regex in ONE place so both fence types stay in sync.
 *
 * Not intended for direct use by consumers — re-exported through the
 * higher-level parsers.
 */

/** A "key: value" line. Key is identifier-like; value runs to end of line. */
export const KEY_VALUE_RE = /^([a-z_][a-z0-9_]*)\s*:\s*(.+?)\s*$/i;

/**
 * BC's WYSIWYG description editor HTML-escapes pasted comment fences:
 *   <!--pm-hero    becomes    &lt;!--pm-hero
 *   -->            becomes    --&gt;
 * and wraps the block in <p>...<br />...<br />...</p>.
 *
 * To keep the admin UX simple ("paste it in the description, hit save"), we
 * decode the common HTML entities BC's editor injects AND strip the structural
 * tags (<p>, </p>, <br>, <br/>, <br />) so the parser sees the original
 * plain-text format the admin typed.
 *
 * If the admin uses BC's HTML/source view to paste raw HTML, the description
 * arrives un-escaped and these transforms are no-ops — both modes work.
 */
export function normalizeBcDescription(description: string): string {
  return description
    .replace(/<\/?p\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}
