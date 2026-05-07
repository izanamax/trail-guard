# Trail Guard MVP

Trail Guard is a product-thinking MVP for hikers and climbers who need a simple way to track gear lifecycle safety.

Core hypothesis: if users can quickly add gear and immediately see lifecycle status, they will use the app to reduce the risk of outdated equipment.

## MVP Scope

### Included
- Auth (register/login via Supabase).
- End-to-end workflow: `Add Gear -> Status Calculation -> Gear List/Details`.
- Category-based retirement calculation (rope/harness/helmet/boots).
- Status outputs: `Safe`, `Warning`, `Retire Soon`, `Expired`, `Manually Retired`.
- Manual retirement controls (`Retire Now`, `Undo Retirement`).
- Optional gear photo (secondary UX helper, not core hypothesis).
- Account erasure flow: `Delete Account & All Data`.

### Not Included
- GPS tracking, GPX import/export, maps, elevation charts, weather.
- Social sharing/discovery features.
- Professional certification logic.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=YOUR_ANON_KEY
```

3. Start app:

```bash
npx expo start
```

## Supabase Function: delete-account

This repository includes `supabase/functions/delete-account/index.ts`.

Purpose:
- Validate user token.
- Delete user rows from `sync_queue` and `gear_items`.
- Delete user files from Storage bucket (default `gear-photos`, configurable by `GEAR_PHOTO_BUCKET`).
- Delete auth user via admin API.

Deploy example:

```bash
supabase functions deploy delete-account
```

Required server secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `GEAR_PHOTO_BUCKET`

## Ethics and Privacy

- App shows explicit disclaimer: always inspect gear manually and follow manufacturer instructions.
- Manual retirement is supported even before calculated expiration.
- Category rules are estimates and intentionally documented as non-certification logic.
- Gear data is private by default.
- Full erasure flow is implemented in Profile via `Delete Account & All Data`.

## Assignment Alignment

- Falsifiable MVP workflow implemented end-to-end (real input, processing, output).
- UI includes domain-relevant safety guidance instead of template content.
- Data changes based on user input and persists locally by user key.
- Ethical risks addressed in product behavior:
  - false sense of safety -> disclaimer + manual retirement.
  - model limitations -> explicit safety limits screen.
- Privacy by Design:
  - data minimization in MVP fields,
  - private-by-default posture,
  - account/data erasure flow.

## Quality Check

Run lint:

```bash
npm run lint
```
