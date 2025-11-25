# CLAUDE.md - Project Guide for Claude Code

## Project Overview

**Dish Transform** is a food photo enhancement and menu building platform for restaurants. It allows restaurant owners to upload food photos, enhance them using AI, generate dish descriptions, and build digital menus with QR codes.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn-ui + Radix UI + Tailwind CSS
- **State/Data**: TanStack React Query + React Hook Form + Zod
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **Payments**: Stripe (token-based pricing)
- **Build Platform**: Lovable.dev

## Quick Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── components/     # React components
│   └── ui/         # shadcn-ui components
├── hooks/          # Custom React hooks
├── integrations/   # External service integrations
│   └── supabase/   # Supabase client and types
├── lib/            # Utility functions
├── pages/          # Page components (routes)
└── main.tsx        # App entry point

supabase/
├── functions/      # Edge Functions (Deno)
│   ├── enhance-food-photo/
│   ├── generate-dish-description/
│   ├── resize-for-social/
│   ├── create-checkout/
│   ├── verify-payment/
│   └── check-tokens/
└── migrations/     # Database migrations
```

## Key Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Index | Landing page |
| `/auth` | Auth | Authentication |
| `/dashboard` | Dashboard | User photo library |
| `/photo/:id` | PhotoDetail | Single photo view & editing |
| `/batch` | BatchUploadPage | Bulk photo upload |
| `/menu` | MenuBuilder | Create/manage menus |
| `/menu/:menuId` | MenuEditor | Edit specific menu |
| `/menu/public/:menuId` | PublicMenu | Public menu view |
| `/settings` | Settings | User settings |
| `/pricing` | Pricing | Token pricing plans |
| `/admin` | AdminDashboard | Admin panel |
| `/admin/settings` | AdminSettings | System settings |

## Database Schema (Supabase)

### Core Tables
- `profiles` - User profiles (id, email, restaurant_name)
- `user_roles` - Role assignments (admin/user)
- `user_tokens` - Token balance per user
- `token_usage` - Token consumption history
- `token_purchases` - Stripe payment records

### Photo Management
- `photo_library` - Original uploaded photos
- `enhanced_photos` - AI-enhanced versions (linked to photo_library)
- `social_exports` - Social media sized exports

### Menu System
- `menus` - User menus (name, template, published status)
- `menu_items` - Menu items (dish_name, price, description, section)

### Other
- `batch_uploads` - Batch upload tracking
- `brand_settings` - Restaurant branding (logo, colors, fonts)
- `system_settings` - Admin configurable settings

## Edge Functions

All edge functions are in `supabase/functions/` and run on Deno:

- **enhance-food-photo**: AI photo enhancement
- **generate-dish-description**: AI-generated dish descriptions
- **resize-for-social**: Resize images for social media platforms
- **create-checkout**: Create Stripe checkout sessions
- **verify-payment**: Verify Stripe payments and add tokens
- **check-tokens**: Check user token balance

## Key Integrations

### Supabase Client
```typescript
import { supabase } from "@/integrations/supabase/client";
```

### Database Types
```typescript
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
```

## Styling Guidelines

- Use Tailwind CSS utility classes
- Follow shadcn-ui component patterns
- Import UI components from `@/components/ui/`
- Use `cn()` utility from `@/lib/utils` for conditional classes

## Token System

Users purchase tokens via Stripe. Token costs:
- Photo enhancement operations consume tokens
- Social media exports consume tokens
- Description generation consumes tokens

Check `token_usage` table for action types and costs.

## Environment Variables

Required in `.env`:
- Supabase URL and keys
- Stripe API keys (for payment functions)

## Notes for Development

1. **Type Safety**: The project uses strict TypeScript. Database types are auto-generated in `src/integrations/supabase/types.ts`.

2. **Route Changes**: When adding new routes, update `src/App.tsx` and add routes above the catch-all `*` route.

3. **UI Components**: Use existing shadcn-ui components from `src/components/ui/` before creating new ones.

4. **Database Changes**: Create migrations in `supabase/migrations/` and regenerate types.

5. **Edge Functions**: Test locally with `supabase functions serve` before deploying.
