# 01 — BigCommerce Storefront API Token Setup

## Why we need this

Catalyst connects to BigCommerce via the GraphQL Storefront API. To authenticate, we need a **Storefront API token** — a JWT that grants read access to the store's catalog, customers, cart, and checkout endpoints.

This is **separate** from creating a new headless channel. We do NOT need to add a new channel to start developing — channel ID `1` (the existing Stencil channel) works for dev.

## Steps

### 1. Open BigCommerce admin
Go to: `https://store-s-v57yvx1djr.mybigcommerce.com/manage/`

### 2. Navigate to API accounts
- Left sidebar → **Settings**
- In the Settings page → **API** section → **Store-level API accounts**

### 3. Create a new API account
- Click **Create API account**
- Token type: **Storefront API token**
- Name: `Catalyst Dev — Local`

### 4. Configure CORS origins
Under **Allowed CORS origins**, add:
```
http://localhost:3000
https://localhost:3000
```

Later when we deploy to Vercel, we'll add:
```
https://next.platinummicro.com
https://platinummicro-catalyst.vercel.app
```

### 5. Set channel scope
- Channels: select **all channels** (or at minimum, channel ID 1)

### 6. Set expiration
- Expires: **1 year out** (max allowed)

### 7. Save and capture the token
- Click **Save**
- BC will display the JWT token **once** — copy it immediately
- Token format: `eyJ...` (long, ~500+ chars)

### 8. Paste into `.env.local`
Open `C:/Users/anuj/Documents/platinummicro-catalyst/.env.local` and replace `PASTE_TOKEN_HERE` with the JWT.

## Security notes

- Storefront API tokens are read-only for catalog data
- Cart/checkout writes happen on the user's behalf, scoped to that user's session
- Never commit `.env.local` — it's in `.gitignore`
- For Vercel deploys, store this token in Vercel's encrypted env vars (NOT in code)
- Rotate the token annually or on any security incident

## When we'll switch to a dedicated headless channel

Right now we're using channel ID 1 (same as Stencil) for dev convenience. Before production cutover:

1. Anuj contacts BC CSM to enable an additional storefront channel on the Enterprise contract
2. We create a new "Catalyst Storefront" channel
3. We generate a fresh token scoped to that channel
4. Update `BIGCOMMERCE_CHANNEL_ID` and `BIGCOMMERCE_STOREFRONT_TOKEN` in Vercel env vars
5. Production runs on the dedicated channel; Stencil remains on channel 1 until DNS cutover
