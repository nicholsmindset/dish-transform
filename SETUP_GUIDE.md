# Dish Transform - Complete Production Setup Guide

Everything you need to set up Supabase, Stripe payments, authentication, and deploy to production.

---

## Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [Database Schema](#2-database-schema)
3. [Stripe Payment Setup](#3-stripe-payment-setup)
4. [Edge Functions (APIs)](#4-edge-functions-apis)
5. [Authentication Setup](#5-authentication-setup)
6. [Environment Variables](#6-environment-variables)
7. [Deployment](#7-deployment)
8. [Post-Deploy Checklist](#8-post-deploy-checklist)

---

## 1. Supabase Setup

### Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users (Singapore recommended for SGD pricing)
3. Set a strong database password (save it securely)
4. Note your **Project URL** and **Anon Key** from Settings > API

### Get Your Keys

From Supabase Dashboard > Settings > API, copy these:

| Key | Where to find | Used for |
|-----|--------------|----------|
| **Project URL** | Settings > API > Project URL | Frontend + Edge Functions |
| **Anon Key** | Settings > API > `anon` `public` | Frontend client |
| **Service Role Key** | Settings > API > `service_role` `secret` | Edge Functions (server-side only) |

> **NEVER expose the Service Role Key in frontend code.** It bypasses RLS.

---

## 2. Database Schema

### All Tables (21 tables total)

Run the complete schema in Supabase SQL Editor: **`supabase/schema.sql`**

Or run the individual migrations in order:

```
supabase/migrations/20251122115910_...sql  -- Storage, profiles, photos, menus
supabase/migrations/20251122122022_...sql  -- User roles (admin/user)
supabase/migrations/20251122122633_...sql  -- System settings
supabase/migrations/20251122140003_...sql  -- Token system
supabase/migrations/20251210_production_rollout.sql  -- Products, subscriptions, payments
```

### Table Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (auto-created on signup via trigger) |
| `photo_library` | Original uploaded dish photos |
| `enhanced_photos` | AI-enhanced variations (3 per original) |
| `batch_uploads` | Batch upload tracking |
| `social_exports` | Social media export records |
| `menus` | Digital menu templates |
| `menu_items` | Individual dishes in menus |
| `brand_settings` | Per-user brand configuration |
| `user_roles` | Admin/user role assignments |
| `system_settings` | Admin-configurable app settings |
| `user_tokens` | Credit balance per user |
| `token_purchases` | Stripe purchase history |
| `token_usage` | Token consumption log |
| `products` | All pricing options (A La Carte + Subscriptions) |
| `subscriptions` | Active subscription records with usage tracking |
| `one_time_purchases` | A La Carte purchase records |
| `rate_limits` | API rate limiting |
| `webhook_events` | Stripe webhook event log (idempotency) |

### Database Functions

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger: auto-creates profile on signup |
| `has_role(user_id, role)` | Check if user has specific role |
| `is_admin()` | Check if current user is admin |
| `check_subscription_usage(user_id)` | Get subscription remaining images |
| `consume_subscription_image(user_id)` | Decrement subscription usage (atomic) |
| `reset_monthly_subscription_usage()` | Reset monthly counters with rollover |
| `check_rate_limit(identifier, endpoint)` | Rate limiting check |
| `add_user_tokens(user_id, tokens)` | Atomic token balance update |

### Make Yourself Admin

After signing up, run in SQL Editor:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Make yourself admin (replace with your actual UUID)
INSERT INTO public.user_roles (user_id, role)
VALUES ('your-uuid-here', 'admin');
```

---

## 3. Stripe Payment Setup

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete identity verification
3. Set your default currency to **SGD** (Singapore Dollar)
4. Stripe Dashboard > Settings > Business Settings > Currency > SGD

### Step 2: Get API Keys

From Stripe Dashboard > Developers > API Keys:

| Key | Environment | Format |
|-----|-------------|--------|
| **Publishable Key** | Test: `pk_test_...` / Live: `pk_live_...` | Frontend (not used currently) |
| **Secret Key** | Test: `sk_test_...` / Live: `sk_live_...` | Edge Functions only |

> Start with **test keys** (`sk_test_...`). Switch to live keys only when ready to charge real cards.

### Step 3: Create Products & Prices

Run the automated script:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY ./scripts/create-stripe-products.sh
```

This creates all 8 products. The script outputs Price IDs you need to update in code.

**Or create manually in Stripe Dashboard > Products:**

#### A La Carte Products (one-time payments)

| Product Name | Price (SGD) | Images |
|-------------|-------------|--------|
| Single Image Enhancement | S$17.50 | 1 |
| 5-Image Pack | S$67.50 | 5 |
| 10-Image Pack | S$110.00 | 10 |
| Full Menu Makeover | S$275.00 | 30 |
| Delivery Platform Refresh | S$190.00 | 20 |

For each: Create Product > Add Price > One-time > SGD > Amount above

#### Subscription Products (recurring monthly)

| Product Name | Monthly Price (SGD) | Images/Month |
|-------------|-------------------|--------------|
| Starter Plan | S$90.00 | 10 |
| Growth Plan | S$165.00 | 20 |
| Premium Plan | S$315.00 | 40 |

For each: Create Product > Add Price > Recurring > Monthly > SGD > Amount above

### Step 4: Update Price IDs in Code

After creating products, Stripe gives you Price IDs (format: `price_xxx`).

Update these in **two files**:

**File 1: `supabase/functions/create-checkout/index.ts`**

Replace the placeholder price IDs in `A_LA_CARTE_PACKAGES` and `SUBSCRIPTION_PACKAGES`:

```typescript
const A_LA_CARTE_PACKAGES = {
  "price_REPLACE_WITH_YOUR_SINGLE_IMAGE_PRICE_ID": { ... },
  "price_REPLACE_WITH_YOUR_5_PACK_PRICE_ID": { ... },
  // etc.
};

const SUBSCRIPTION_PACKAGES = {
  "price_REPLACE_WITH_YOUR_STARTER_PRICE_ID": { ... },
  "price_REPLACE_WITH_YOUR_GROWTH_PRICE_ID": { ... },
  "price_REPLACE_WITH_YOUR_PREMIUM_PRICE_ID": { ... },
};
```

**File 2: `src/pages/Pricing.tsx`**

Update the `priceId` field in each package:

```typescript
const A_LA_CARTE_PACKAGES = [
  { name: "Single Image", priceId: "price_YOUR_ACTUAL_ID", ... },
  // etc.
];
```

### Step 5: Set Up Webhook

This is **critical** for payments to actually credit users.

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click **Add endpoint**
3. Set the endpoint URL:
   ```
   https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing Secret** (starts with `whsec_...`)
7. Save it as `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function env vars

### Step 6: Test the Payment Flow

1. Use Stripe test card: `4242 4242 4242 4242` (any future expiry, any CVC)
2. Go to your `/pricing` page
3. Sign in and click "Purchase" on any package
4. Complete checkout with test card
5. Check:
   - Stripe Dashboard > Payments (should show payment)
   - Supabase > Table Editor > `token_purchases` (should have new row)
   - Supabase > Table Editor > `user_tokens` (should show credits added)

### Payment Flow Diagram

```
User clicks "Purchase" on Pricing page
        |
        v
Frontend calls create-checkout Edge Function
        |
        v
Edge Function creates Stripe Checkout Session
        |
        v
User redirected to Stripe Checkout page
        |
        v
User pays with credit card
        |
        v
Two things happen simultaneously:
        |
   +---------+----------+
   |                      |
   v                      v
User redirected to     Stripe sends webhook
/payment-success       to stripe-webhook function
   |                      |
   v                      v
verify-payment         Records purchase in DB,
Edge Function          credits tokens/images,
(backup verification)  sends confirmation email
```

### Going Live with Stripe

When ready for real payments:

1. Stripe Dashboard > Complete account activation
2. Switch `sk_test_...` to `sk_live_...` in Supabase env vars
3. Create a **new webhook endpoint** with your live API key
4. Update `STRIPE_WEBHOOK_SECRET` with the live webhook signing secret
5. Re-create products with live keys (or use the same ones if already activated)

---

## 4. Edge Functions (APIs)

### All 8 Edge Functions

Deploy all functions to Supabase:

```bash
supabase functions deploy create-checkout
supabase functions deploy verify-payment
supabase functions deploy stripe-webhook
supabase functions deploy check-tokens
supabase functions deploy enhance-food-photo
supabase functions deploy generate-dish-description
supabase functions deploy resize-for-social
supabase functions deploy send-email
```

Or deploy all at once:

```bash
supabase functions deploy --all
```

### API Reference

#### 1. `create-checkout` - Start Payment

**Auth**: Required (JWT)
**Method**: POST

```json
// Request body
{
  "priceId": "price_xxx",
  "purchaseType": "one_time",  // or "subscription"
  "productId": "optional-uuid"
}

// Response
{
  "url": "https://checkout.stripe.com/c/pay/...",
  "sessionId": "cs_xxx"
}
```

#### 2. `verify-payment` - Verify After Redirect

**Auth**: Not required (called on redirect)
**Method**: POST

```json
// Request body
{ "sessionId": "cs_xxx" }

// Response
{
  "success": true,
  "tokensAdded": 10,
  "message": "10 tokens added to your account!"
}
```

#### 3. `stripe-webhook` - Stripe Event Handler

**Auth**: Not required (verified by Stripe signature)
**Method**: POST (called by Stripe)

Handles: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

#### 4. `check-tokens` - Get Credit Balance

**Auth**: Required (JWT)
**Method**: POST

```json
// Response
{
  "tokens": 25,
  "lastUpdated": "2025-01-15T10:00:00Z"
}
```

#### 5. `enhance-food-photo` - AI Photo Enhancement

**Auth**: Not required (rate-limited by IP)
**Method**: POST

```json
// Request body
{
  "imageUrl": "https://...",
  "userId": "uuid",
  "photoLibraryId": "uuid",
  "selectedStyles": ["Clean White Background"],
  "customPrompt": "optional custom style"
}

// Response
{
  "photos": [
    { "name": "Clean White Background", "imageUrl": "https://...", "style": "clean-white-background" },
    { "name": "Rustic Table Setting", "imageUrl": "https://...", "style": "rustic-table-setting" },
    { "name": "Dark Moody Background", "imageUrl": "https://...", "style": "dark-moody-background" }
  ],
  "metadata": { "totalGenerated": 3, "model": "gemini-banana-pro" }
}
```

#### 6. `generate-dish-description` - AI Description

**Auth**: Not required
**Method**: POST

#### 7. `resize-for-social` - Social Media Export

**Auth**: Not required
**Method**: POST

#### 8. `send-email` - Email Notifications

**Auth**: Required (service role)
**Method**: POST

```json
{
  "to": "user@example.com",
  "template": "purchase_confirmation",
  "data": { "packageName": "10-Image Pack", "imagesCount": 10, "amount": "110.00" }
}
```

Templates: `welcome`, `purchase_confirmation`, `subscription_started`, `photos_ready`

### Edge Function Environment Variables

Set these in **Supabase Dashboard > Edge Functions > Settings**:

```
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_xxx (or sk_live_xxx for production)
STRIPE_WEBHOOK_SECRET=whsec_xxx
FAL_KEY=your-fal-ai-api-key
ALLOWED_ORIGIN=https://dishtransform.com
SITE_URL=https://dishtransform.com
RESEND_API_KEY=re_xxx (for email notifications)
FROM_EMAIL=Dish Transform <noreply@dishtransform.com>
```

---

## 5. Authentication Setup

### How Auth Works

The app uses **Supabase Auth** with email/password. No external providers (Google, GitHub, etc.) are configured — just email login.

### Auth Flow

```
/auth page
  |
  +-- Sign Up: email + password + restaurant name
  |     |
  |     +-- supabase.auth.signUp({ email, password, data: { restaurant_name } })
  |     +-- Trigger: handle_new_user() auto-creates profile row
  |     +-- Redirect to /dashboard
  |
  +-- Sign In: email + password
        |
        +-- supabase.auth.signInWithPassword({ email, password })
        +-- Redirect to /dashboard
```

### Auth Configuration in Supabase

Go to **Supabase Dashboard > Authentication > Settings**:

1. **Site URL**: Set to your production domain
   ```
   https://dishtransform.com
   ```

2. **Redirect URLs**: Add all allowed redirect URLs
   ```
   https://dishtransform.com/**
   http://localhost:5173/**
   http://localhost:8080/**
   ```

3. **Email Templates** (Authentication > Email Templates):
   - **Confirm signup**: Customize the verification email
   - **Reset password**: Customize the password reset email
   - **Magic link**: Not used but available

4. **Email Confirmations** (optional):
   - For testing: Disable "Confirm email" in Auth > Settings
   - For production: Enable it so users verify their email

5. **Password Settings**:
   - Minimum password length: 6 (current setting)

### Frontend Auth Code

**Login/Registration page**: `src/pages/Auth.tsx`

The page handles both sign-in and sign-up with a toggle. On sign-up, it:
1. Creates the auth user
2. Updates the profile with `restaurant_name`
3. Redirects to dashboard

**Protected routes**: Pages check auth in their `useEffect`:

```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) navigate("/auth");
  });
}, []);
```

### Routes

| Route | Auth Required | Description |
|-------|:---:|-------------|
| `/` | No | Landing page |
| `/auth` | No | Login/Sign up |
| `/pricing` | No | Pricing page (purchase requires auth) |
| `/payment-success` | No | Post-payment redirect |
| `/dashboard` | Yes | User dashboard |
| `/photo/:id` | Yes | Photo detail/editing |
| `/settings` | Yes | User settings |
| `/menu` | Yes | Menu builder |
| `/batch` | Yes | Batch upload |
| `/admin` | Yes (admin) | Admin dashboard |
| `/admin/settings` | Yes (admin) | Admin settings |

---

## 6. Environment Variables

### Frontend (.env)

Create `.env` in project root:

```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SENTRY_DSN=your-sentry-dsn-optional
VITE_APP_VERSION=1.0.0
```

### Supabase Edge Functions

Set in **Supabase Dashboard > Edge Functions > Manage Secrets**:

| Variable | Value | Required |
|----------|-------|:---:|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Yes |
| `SUPABASE_ANON_KEY` | `eyJ...` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Yes |
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Yes |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Yes |
| `FAL_KEY` | Your FAL.ai API key | Yes |
| `ALLOWED_ORIGIN` | `https://dishtransform.com` | Yes |
| `SITE_URL` | `https://dishtransform.com` | Yes |
| `RESEND_API_KEY` | `re_...` | For emails |
| `FROM_EMAIL` | `Dish Transform <noreply@dishtransform.com>` | For emails |

### Vercel (Frontend Hosting)

Set in **Vercel Dashboard > Project > Settings > Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your anon key |
| `VITE_SENTRY_DSN` | Your Sentry DSN |

---

## 7. Deployment

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect your GitHub repo in Vercel Dashboard for auto-deploy on push.

### Deploy Edge Functions to Supabase

```bash
# Install Supabase CLI
npm i -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy all functions
supabase functions deploy --all

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set FAL_KEY=your-fal-key
supabase secrets set ALLOWED_ORIGIN=https://dishtransform.com
supabase secrets set SITE_URL=https://dishtransform.com
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set FROM_EMAIL="Dish Transform <noreply@dishtransform.com>"
```

---

## 8. Post-Deploy Checklist

### Before Going Live

- [ ] Run database schema (`supabase/schema.sql`) in SQL Editor
- [ ] Create Stripe products (run `scripts/create-stripe-products.sh`)
- [ ] Update Price IDs in `create-checkout/index.ts` and `Pricing.tsx`
- [ ] Deploy all edge functions
- [ ] Set all edge function secrets
- [ ] Create Stripe webhook endpoint pointing to your function URL
- [ ] Set `ALLOWED_ORIGIN` to your production domain
- [ ] Set Supabase Auth Site URL to your production domain
- [ ] Add redirect URLs in Supabase Auth settings
- [ ] Deploy frontend to Vercel
- [ ] Set Vercel environment variables
- [ ] Sign up as first user
- [ ] Make yourself admin (SQL: `INSERT INTO user_roles...`)
- [ ] Test payment with Stripe test card (`4242 4242 4242 4242`)
- [ ] Verify webhook fires (check Stripe Dashboard > Webhooks > Recent events)
- [ ] Verify tokens credited (check `user_tokens` table)
- [ ] Switch to Stripe live keys when ready for real payments

### External Services Needed

| Service | Purpose | Sign Up |
|---------|---------|---------|
| [Supabase](https://supabase.com) | Database, Auth, Edge Functions, Storage | Required |
| [Stripe](https://stripe.com) | Payment processing | Required |
| [Vercel](https://vercel.com) | Frontend hosting | Required |
| [FAL.ai](https://fal.ai) | AI image enhancement | Required |
| [Resend](https://resend.com) | Email notifications | Optional |
| [Sentry](https://sentry.io) | Error tracking | Optional |

### Pricing Summary (SGD)

**A La Carte (one-time):**
| Package | Price | Images |
|---------|-------|--------|
| Single Image | S$17.50 | 1 |
| 5-Image Pack | S$67.50 | 5 |
| 10-Image Pack | S$110.00 | 10 |
| Full Menu Makeover | S$275.00 | 30 |
| Delivery Refresh | S$190.00 | 20 |

**Subscriptions (monthly):**
| Plan | Price | Images/mo | Social Posts | Priority |
|------|-------|-----------|-------------|----------|
| Starter | S$90/mo | 10 | 0 | No |
| Growth | S$165/mo | 20 | 2 | No |
| Premium | S$315/mo | 40 | 4 | Yes (24hr) |

**Subscriber Perks:** Locked-in pricing, rollover up to 5 images, free re-edits, priority turnaround (Premium).
