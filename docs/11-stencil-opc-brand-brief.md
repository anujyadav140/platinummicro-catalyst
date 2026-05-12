# 11 — Stencil OPC Brand Styling Brief

How to make BC's hosted Stencil checkout look like the Platinum Micro design system. **Manual setup in BC admin** — ~30 minutes, no code on our side.

## What this covers

The Stencil **Optimized One-Page Checkout (OPC)** is the form BC hosts at `checkout.aaawave-sandbox-1.mybigcommerce.com`. After this brief is applied, users see:

- Navy headings, terracotta CTAs
- Google Sans Flex font (falls back to system sans if not loaded)
- White cards on warm-paper background — matches Catalyst storefront
- Platinum Micro logo top-left

What it does NOT touch: the OPC form structure (BC controls that), the post-order "Thank You" page (separate brief if we want to polish that later).

## Step-by-step

### 1. Open the checkout customizer

BC admin → **Storefront** → **Checkout** → **Customize Checkout**

You'll land in a side-by-side preview / settings panel.

### 2. Logo

- Click "Logo" section
- Upload: same logo file we use in the Catalyst header (`/public/pm/logo.png` in the repo)
  - If you don't have a transparent PNG handy, export one from your design source — 320×96px is plenty
- Position: **Left**

### 3. Colors

Paste these hex codes into the matching fields. They come from `core/globals.css` brand tokens — kept in sync so storefront + checkout look identical.

| Field | Hex | What it controls |
|---|---|---|
| **Header background** | `#FFFFFF` | Top bar on checkout |
| **Header text color** | `#0D2340` | Logo wordmark area |
| **Body background** | `#FBFAF7` | The page-level background (warm paper) |
| **Body text** | `#101828` | Default text color (ink-900) |
| **Heading text** | `#0D2340` | Section headings (navy-deep) |
| **Link** | `#1B3A6B` | Inline links (navy-mid) |
| **Link hover** | `#2E6DB4` | (navy-light) |
| **Primary button background** | `#A63D2F` | "Continue", "Place Order" CTAs (terracotta) |
| **Primary button text** | `#FFFFFF` | |
| **Primary button hover background** | `#C04E3E` | (terracotta-light) |
| **Secondary button background** | `#FFFFFF` | "Edit" / "Cancel" |
| **Secondary button text** | `#0D2340` | (navy-deep) |
| **Secondary button border** | `#D0D5DD` | (ink-300) |
| **Border** | `#EAECEF` | Card outlines, input outlines (ink-200) |
| **Form input background** | `#FFFFFF` | |
| **Form input border** | `#D0D5DD` | (ink-300) |
| **Form input focus border** | `#0D2340` | (navy-deep) |
| **Error background** | `#FBEBEA` | Validation error fields |
| **Error text** | `#A63D2F` | (terracotta) |
| **Success background** | `#E6F4EE` | Success toasts |
| **Success text** | `#2F7D5B` | (success) |

### 4. Typography

| Field | Value |
|---|---|
| **Heading font family** | `'Google Sans Flex', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif` |
| **Body font family** | Same as heading |
| **Heading weight** | `600` |
| **Body weight** | `400` |
| **Base font size** | `15px` |

**Note on Google Sans Flex:** the variable font ships locally in `/public/fonts/GoogleSansFlex.ttf` on the Catalyst side. Stencil OPC will try to load whatever you list FIRST — since the OPC iframe doesn't have access to our `/fonts/` directory, it'll fall back to system fonts. That's fine; system-ui on modern OS/browsers looks very close. If you want pixel-perfect, upload the TTF to BC's file manager and reference it as a Web Font.

### 5. Buttons

| Field | Value |
|---|---|
| **Border radius** | `6px` |
| **Padding** | `Medium` (BC's standard) |
| **Text transform** | `None` (do NOT uppercase) |
| **Font weight** | `600` |

### 6. Inputs

| Field | Value |
|---|---|
| **Border radius** | `6px` |
| **Border width** | `1px` |
| **Focus ring** | `2px navy-deep (#0D2340)` |
| **Padding** | `12px` |

### 7. Order summary panel (right side of OPC)

- Background: `#FFFFFF` (white card)
- Border: `1px solid #EAECEF`
- Border radius: `8px`
- Shadow: `subtle` (BC's lightest preset)

### 8. Save + preview

- Click **Save** at top right
- Open the preview pane → verify nothing looks broken
- Specifically check:
  - "Continue to shipping" button is terracotta with white text
  - Section headings ("1. Customer", "2. Shipping") are navy
  - Form inputs have rounded corners and navy focus rings
  - Order summary sits in a clean white card on the warm-paper bg

### 9. Test end-to-end

1. From Catalyst (`/dev/preview/`), add a product to cart
2. Click "Check out" — should land on the styled Stencil OPC
3. Walk through to "Place Order" with the test card `4111 1111 1111 1111`
4. Screenshot before/after for the changelog

## After this is done

✅ Stencil OPC matches the Platinum Micro brand. Customers transitioning from Catalyst to checkout no longer get the "wait, did I land on a different site?" moment.

🚧 Next blocker is connecting a real payment gateway — see `12-payment-gateway-onboarding.md`.

## If something looks off

- **Logo too big / too small:** BC's logo height is fixed at ~40px. Upload a wider transparent PNG (e.g. 600×80) so the proportions match.
- **Fonts look generic:** Check if Google Sans Flex made it into BC's Web Fonts. Otherwise the system fallback (likely SF Pro on Mac, Segoe UI on Windows) is the next-best option.
- **Buttons too dark on hover:** Lighten `#C04E3E` to `#D45F4F`. We can iterate.
- **Anything BC's customizer can't reach:** Custom CSS field at the bottom of the customizer accepts a CSS file. Open a ticket and I'll author overrides.
