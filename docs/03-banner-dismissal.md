# Banner dismissal — persisting the X-close

When a user clicks the X on a BC admin-managed banner strip at the top of the
page, the dismissal must survive a hard refresh, a new tab on the same browser,
and a navigation to a different route. It must NOT survive switching browsers
or wiping site data — that's the natural "I want to see banners again" reset.

If a BC admin deletes and recreates a banner, BC issues a new numeric ID, so
the recreated banner shows up to every user as if it were brand new. That's
the desired behaviour, and it's why we key dismissal on BC banner ID rather
than on banner name or hash of content.

## Files changed

- `core/lib/pm-top-bar-cookie.ts` — added the per-banner cookie constant, a
  parser, an append helper, and a clear helper. The existing top-bar cookie
  pattern lives in the same module so all dismissal-cookie wiring is in one
  file.
- `core/components/pm-banner-strip/pm-banner-strip.tsx` — the X handler now
  calls `appendDismissedBannerId(banner.id)`, flips local state for an
  instant disappearance, and calls `router.refresh()` so other banner strips
  on the page (e.g. the bottom placement) pick up the new cookie state on
  the next server render.
- `core/app/dev/preview/layout.tsx` — reads the cookie via
  `cookies()` (already imported), parses it into a `Set<number>`, and
  filters dismissed banners out of the list before splitting trust-bar copy
  vs. regular banners. The filter runs before the `PmBannerStrip` ever
  receives the banner list, so the dismissed banners are never sent down to
  the client — no SSR-to-CSR flash.

## How persistence works

**Cookie, not localStorage.** Reasons, in priority order:

1. **No first-paint flash.** The server can filter dismissed banners out of
   the SSR'd HTML directly, so the user never sees a "ghost flash" of a
   banner about to disappear. localStorage would require rendering banners
   on the server, then hiding them on the client after a `useEffect` check
   — visible flicker on slow devices.
2. **Consistency with existing code.** `PM_TOP_BAR_DISMISSED_COOKIE` already
   uses this exact pattern for the navy top bar; mirroring it keeps the
   mental model simple ("dismissals live in cookies on this site").
3. **Server-side trust.** If we later need to suppress a banner from a
   middleware or analytics layer, the cookie is already on the request.

**Shape:** one cookie, comma-separated BC banner IDs.

```
pm_dismissed_banners=12,17,42
```

- Cookie name: `pm_dismissed_banners` (exported as
  `PM_DISMISSED_BANNERS_COOKIE` from `core/lib/pm-top-bar-cookie.ts`).
- Path: `/dev/preview` (same scope as the existing top-bar cookie; when the
  storefront moves out of `/dev/preview`, both paths get updated in one
  file).
- Max-age: 365 days.
- SameSite: `lax`. No `httpOnly` (client needs to write it). No `secure` in
  dev — production writer should add it when we cut over to https.
- Parser is defensive: non-numeric tokens are silently dropped, so a hand-
  edited cookie can't crash render.

## How to test

1. Start the dev server and open <http://localhost:3000/dev/preview/>.
2. Click the X on one of the top-of-page banner strips. It disappears.
3. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R). The banner stays gone.
4. Navigate to <http://localhost:3000/dev/preview/category/servers/>. Still
   gone.
5. Open <http://localhost:3000/dev/preview/> in an incognito window or a
   different browser. The banner is back — dismissal is per-browser, as
   intended.
6. To confirm a recreated banner reappears: in BC admin, delete the banner
   and create a new one with identical copy. The new banner has a new ID,
   so it bypasses the dismissed list and shows up again.

## How to un-dismiss everything (QA reset)

Pick whichever is easiest for you:

- **Browser devtools** — open Application → Cookies → your dev origin →
  delete the `pm_dismissed_banners` cookie. Refresh.
- **Console one-liner** — paste this into the browser console on a page
  served under `/dev/preview`:

  ```js
  document.cookie = 'pm_dismissed_banners=; max-age=0; path=/dev/preview';
  location.reload();
  ```

- **Programmatic** — the helper `clearDismissedBannersCookie()` in
  `core/lib/pm-top-bar-cookie.ts` wipes it from anywhere on the client.
- **Nuclear option** — Site Settings → Clear site data. Also wipes the
  navy top-bar dismissal, cart cookies, etc., so only use this if you want
  a fully fresh user.
