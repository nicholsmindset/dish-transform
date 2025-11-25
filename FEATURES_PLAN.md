# Features & Fixes Plan

## Priority 1: Critical (Prevents Crashes/Data Loss)

### 1.1 Dashboard Pagination
**File:** `src/pages/Dashboard.tsx`

**Problem:** No pagination - all photos load at once, causing crashes for users with many photos.

**Solution:**
```typescript
// Add pagination state
const [page, setPage] = useState(1);
const PHOTOS_PER_PAGE = 20;

// Update query with pagination
const { data, error } = await supabase
  .from('photo_library')
  .select(...)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range((page - 1) * PHOTOS_PER_PAGE, page * PHOTOS_PER_PAGE - 1);

// Add pagination controls UI
```

**Implementation:**
- Add page state and items per page constant
- Update Supabase query with `.range()`
- Add "Load More" button or pagination controls
- Show total photo count
- Optional: Implement infinite scroll

---

### 1.2 Admin Dashboard Pagination
**File:** `src/pages/AdminDashboard.tsx`

**Problem:** Users table limited to 50, purchases to 20. No way to see beyond these limits.

**Solution:**
- Add pagination to users table
- Add pagination to purchases table
- Fix N+1 query problem by joining user_roles in single query

**Implementation:**
```typescript
// Change from multiple queries to single query with join
const { data: users } = await supabase
  .from('profiles')
  .select(`
    *,
    user_roles (role)
  `)
  .range(start, end)
  .order('created_at', { ascending: false });
```

---

### 1.3 Batch Upload - Link Photos to Batch
**File:** `src/components/BatchUpload.tsx`

**Problem:** Batch record created but photos not linked back to it.

**Solution:**
- Pass `batch_id` when inserting photos to `photo_library`
- Update batch `completed_images` count correctly

---

## Priority 2: High (Affects User Experience)

### 2.1 Token Deduction Verification
**Files:** Edge functions

**Check:** Ensure `enhance-food-photo` function deducts tokens from `user_tokens` table.

**If missing, add:**
```typescript
// In enhance-food-photo/index.ts
// After successful enhancement:
await supabase
  .from('token_usage')
  .insert({
    user_id: userId,
    tokens_used: 1,
    action_type: 'photo_enhancement',
    photo_library_id: photoLibraryId
  });

await supabase
  .from('user_tokens')
  .update({ tokens: tokens - 1 })
  .eq('user_id', userId);
```

---

### 2.2 Dashboard Search & Filter
**File:** `src/pages/Dashboard.tsx`

**Add:**
- Date range filter
- Sort options (newest, oldest, name)
- Enhanced count filter

---

### 2.3 Public Menu SEO & Sharing
**File:** `src/pages/PublicMenu.tsx`

**Add:**
- Document title update: `document.title = menu.name`
- Meta description
- Social sharing buttons (copy link, share to social)
- Print to PDF button

---

### 2.4 Settings Validation
**File:** `src/pages/Settings.tsx`

**Add:**
- Restaurant name length validation (2-100 chars)
- Logo URL format validation
- Color hex validation (#XXXXXX format)
- Preview logo before saving

---

## Priority 3: Medium (Feature Completeness)

### 3.1 Batch Upload Improvements
**File:** `src/components/BatchUpload.tsx`

**Add:**
- Token balance check before starting batch
- Display error details for failed photos
- Retry button for failed uploads
- Show token cost estimate

---

### 3.2 Admin Settings Validation
**File:** `src/pages/AdminSettings.tsx`

**Add:**
- Numeric input validation (positive numbers only)
- Confirmation dialog for critical changes
- Rollback on partial failure

---

### 3.3 Dashboard Delete Functionality
**File:** `src/pages/Dashboard.tsx`

**Add:**
- Delete button on photo cards
- Bulk delete selection
- Confirmation dialog

---

### 3.4 Social Export History
**File:** `src/pages/PhotoDetail.tsx`

**Problem:** Social exports generated but not displayed.

**Add:**
- Fetch and display previous social exports
- Download buttons for each export

---

## Priority 4: Polish

### 4.1 Loading States
- Add skeleton loaders to all pages
- Add loading spinners to buttons during actions

### 4.2 Error Boundaries
- Add React error boundaries to prevent white screen crashes

### 4.3 Mobile Responsiveness
- Test and fix mobile layouts

### 4.4 Accessibility
- Add ARIA labels
- Keyboard navigation support

---

## Implementation Order

| Phase | Tasks | Estimated Effort |
|-------|-------|------------------|
| 1 | Dashboard pagination, Admin pagination | 2-3 hours |
| 2 | Token deduction verification, Batch-photo linking | 1-2 hours |
| 3 | Settings validation, Search/filter | 2-3 hours |
| 4 | Public menu SEO, Social export history | 1-2 hours |
| 5 | Batch upload improvements | 2 hours |
| 6 | Delete functionality, Admin validation | 2 hours |
| 7 | Polish (loading states, error boundaries) | 2-3 hours |

---

## Quick Wins (Can Do Now)

1. **Dashboard pagination** - Critical for app stability
2. **Settings validation** - Prevents bad data
3. **Token check in batch upload** - Prevents failed batches
4. **Public menu title** - Simple SEO improvement

---

## Files to Create

None needed - all changes are to existing files.

## Database Changes

None needed - existing schema supports all features.
