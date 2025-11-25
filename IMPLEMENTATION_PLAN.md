# Dish Transform - Implementation Plan

## Overview

This plan outlines all steps required to get the Dish Transform web application fully functional. The app is a food photo enhancement platform with menu building capabilities for restaurants.

---

## Phase 1: Environment & Dependencies Setup

### 1.1 Install Node Dependencies
```bash
npm install
```

### 1.2 Configure Environment Variables

The `.env` file needs these variables (some already configured):

| Variable | Status | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Configured | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Configured | Supabase anon key |

---

## Phase 2: Supabase Backend Setup

### 2.1 Edge Function Secrets

Deploy secrets to Supabase Edge Functions via Supabase Dashboard > Project Settings > Edge Functions > Secrets:

| Secret Name | Required For | How to Obtain |
|-------------|--------------|---------------|
| `STRIPE_SECRET_KEY` | create-checkout, verify-payment | Stripe Dashboard > Developers > API Keys |
| `FAL_KEY` | enhance-food-photo | fal.ai Dashboard > API Keys |
| `LOVABLE_API_KEY` | generate-dish-description | Lovable.dev platform |

### 2.2 Storage Buckets

Ensure these buckets exist in Supabase Storage:

| Bucket | Purpose | Public |
|--------|---------|--------|
| `enhanced-photos` | Store AI-enhanced images | Yes |
| `original-photos` | Store uploaded originals | Yes |

**To create via Supabase Dashboard:**
1. Go to Storage > New Bucket
2. Set bucket name and enable public access
3. Add RLS policies for authenticated users

### 2.3 Verify Database Tables

All tables should exist from migrations. Verify in Supabase Dashboard:
- `profiles` - User profiles
- `user_roles` - Admin/user roles
- `user_tokens` - Token balances
- `token_usage` - Token consumption
- `token_purchases` - Stripe payments
- `photo_library` - Original photos
- `enhanced_photos` - AI variations
- `social_exports` - Social media exports
- `menus` - User menus
- `menu_items` - Menu dishes
- `batch_uploads` - Batch tracking
- `brand_settings` - Restaurant branding
- `system_settings` - Admin settings

### 2.4 Database RLS Policies

Ensure Row Level Security policies allow:
- Users to read/write their own data
- Public read access to published menus
- Admin access to system_settings

---

## Phase 3: External Services Configuration

### 3.1 Stripe Setup

**Required Steps:**
1. Create Stripe account at stripe.com
2. Create 3 Products with Prices:

| Product Name | Price | Price ID (update in code) |
|--------------|-------|---------------------------|
| Starter Pack (30 tokens) | $29.00 | `price_1SWHKUDjNCv7xF61k4cyV8bH` |
| Pro Pack (100 tokens) | $79.00 | `price_1SWHKxDjNCv7xF61zfM3OKwY` |
| Business Pack (300 tokens) | $199.00 | `price_1SWHLiDjNCv7xF61AYheH0Ts` |

3. Get Secret Key from Stripe Dashboard > Developers > API Keys
4. Add to Supabase Edge Function secrets

**Files to update if Price IDs change:**
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/verify-payment/index.ts`
- `src/pages/Pricing.tsx`

### 3.2 FAL AI Setup

**Required Steps:**
1. Create account at fal.ai
2. Generate API key
3. Add `FAL_KEY` to Supabase secrets
4. Ensure billing/credits available for `fal-ai/nano-banana-pro/edit` model

### 3.3 Lovable AI Setup

**Required Steps:**
1. The app uses Lovable's AI gateway at `https://ai.gateway.lovable.dev`
2. Get API key from Lovable platform
3. Add `LOVABLE_API_KEY` to Supabase secrets

---

## Phase 4: Critical Code Fixes

### 4.1 Token Balance Checking (High Priority)

**Issue:** Users can enhance photos without checking token balance first.

**Files to modify:**
- `src/pages/Index.tsx` - Add token check before enhancement
- `src/components/BatchUpload.tsx` - Add token check before batch processing

**Implementation:**
```typescript
// Before calling enhance-food-photo, check tokens:
const { data: tokenData } = await supabase.functions.invoke('check-tokens');
if (tokenData.tokens < requiredTokens) {
  toast.error("Insufficient tokens. Please purchase more.");
  return;
}
```

### 4.2 Auth Protection Enhancement (High Priority)

**Issue:** PhotoDetail and MenuEditor don't verify resource ownership.

**Files to modify:**
- `src/pages/PhotoDetail.tsx` - Verify user owns the photo
- `src/pages/MenuEditor.tsx` - Verify user owns the menu

**Implementation:**
```typescript
// Add to data fetch query:
.eq('user_id', user.id)
```

### 4.3 Password Reset Flow (Medium Priority)

**Issue:** No forgot password functionality.

**File to modify:** `src/pages/Auth.tsx`

**Implementation:**
- Add "Forgot Password?" link
- Implement `supabase.auth.resetPasswordForEmail()`
- Create password reset confirmation page

### 4.4 Error Handling Improvements (Medium Priority)

**Files to modify:**
- `src/pages/Index.tsx` - Better error messages for enhancement failures
- `src/pages/PhotoDetail.tsx` - Handle resize-for-social errors
- `src/pages/PaymentSuccess.tsx` - Add timeout and retry logic

### 4.5 Form Validation (Low Priority)

**Files to modify:**
- `src/pages/MenuEditor.tsx` - Validate required fields before save
- `src/pages/MenuBuilder.tsx` - Validate menu name properly
- `src/pages/Auth.tsx` - Better email/password validation

---

## Phase 5: Feature Completions

### 5.1 Settings Page Review

**File:** `src/pages/Settings.tsx`

**Verify functionality:**
- Brand settings (logo, colors, fonts)
- Watermark toggle
- Restaurant name update

### 5.2 Admin Dashboard Review

**Files:**
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminSettings.tsx`

**Verify functionality:**
- User management
- System settings configuration
- Usage analytics

### 5.3 Public Menu Page Review

**File:** `src/pages/PublicMenu.tsx`

**Verify functionality:**
- Menu renders without auth
- QR code links work
- Templates display correctly

### 5.4 Batch Upload Component

**File:** `src/components/BatchUpload.tsx`

**Verify functionality:**
- Multiple file selection
- Progress tracking
- Token consumption per image
- Error handling for failed uploads

---

## Phase 6: Testing Checklist

### 6.1 Authentication Flow
- [ ] Sign up with email/password
- [ ] Profile creation with restaurant name
- [ ] Login/logout
- [ ] Session persistence
- [ ] Protected route redirects

### 6.2 Photo Enhancement Flow
- [ ] Upload single photo
- [ ] Select enhancement styles
- [ ] Custom prompt option
- [ ] View enhanced results
- [ ] Download individual images
- [ ] Download as ZIP
- [ ] Regenerate specific styles
- [ ] Save to photo library

### 6.3 Token System
- [ ] View token balance
- [ ] Purchase tokens (Stripe checkout)
- [ ] Payment success callback
- [ ] Tokens added to account
- [ ] Token deduction on usage

### 6.4 Menu Builder
- [ ] Create new menu
- [ ] Add items from enhanced photos
- [ ] Edit item details (name, price, description)
- [ ] Generate AI descriptions
- [ ] Drag-to-reorder items
- [ ] Change template
- [ ] Publish/unpublish menu
- [ ] View public menu URL
- [ ] Generate QR code

### 6.5 Social Media Export
- [ ] Select platforms
- [ ] Generate optimized versions
- [ ] Download exports

### 6.6 Batch Upload
- [ ] Select multiple files
- [ ] Track upload progress
- [ ] View results in dashboard

---

## Phase 7: Deployment Checklist

### 7.1 Pre-Deployment
- [ ] All environment variables set in production
- [ ] Stripe webhook configured (if using webhooks)
- [ ] Supabase Edge Functions deployed
- [ ] Storage bucket policies configured
- [ ] RLS policies enabled and tested

### 7.2 Build & Deploy
```bash
npm run build
```
Deploy via Lovable.dev or your hosting platform.

### 7.3 Post-Deployment Verification
- [ ] Authentication works
- [ ] Edge functions respond correctly
- [ ] Stripe payments process in live mode
- [ ] Images upload and enhance correctly
- [ ] Public menus accessible

---

## Quick Start (Minimum Viable Setup)

For fastest path to a working app:

1. **Install dependencies:** `npm install`
2. **Add Supabase secrets:**
   - `STRIPE_SECRET_KEY`
   - `FAL_KEY`
   - `LOVABLE_API_KEY`
3. **Create storage bucket:** `enhanced-photos` (public)
4. **Run app:** `npm run dev`
5. **Test:** Sign up > Upload photo > Enhance > View results

---

## Priority Order

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Add Supabase secrets (Stripe, FAL, Lovable) | 30 min |
| P0 | Create storage buckets | 10 min |
| P1 | Token balance checking | 2 hours |
| P1 | Resource ownership verification | 1 hour |
| P2 | Password reset flow | 2 hours |
| P2 | Error handling improvements | 3 hours |
| P3 | Form validation | 2 hours |
| P3 | Settings page completion | 2 hours |
