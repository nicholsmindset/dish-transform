# Dish Transform

Professional AI-powered food photography enhancement for restaurants. Transform ordinary dish photos into stunning, appetizing images that drive orders.

## Features

- **AI Photo Enhancement** - Transform any dish photo into professional restaurant photography with 3 style variations
- **Multiple Styles** - Clean White Background, Rustic Table Setting, Dark Moody Background
- **Menu Builder** - Drag-and-drop menu editor with QR code generation
- **Social Media Export** - Optimized exports for Instagram, Facebook, TikTok, and more
- **AI Descriptions** - Generate appetizing menu descriptions with tone control
- **Batch Processing** - Upload and enhance multiple photos at once

## Pricing (SGD)

### A La Carte
| Service | Price | Images |
|---------|-------|--------|
| Single Image Enhancement | S$15–20 | 1 |
| 5-Image Pack | S$60–75 | 5 |
| 10-Image Pack | S$100–120 | 10 |
| Full Menu Makeover | S$250–300 | 30 |
| GrabFood/Deliveroo Listing | S$180–200 | 20 |

### Subscriptions (Monthly)
| Plan | Price/Month | Images | Social Posts | Turnaround |
|------|-------------|--------|--------------|------------|
| Starter | S$80–100 | 10 | - | 48hr |
| Growth | S$150–180 | 20 | 2 | 48hr |
| Premium | S$280–350 | 40 | 4 | 24hr priority |

**Subscription Perks:**
- Locked-in pricing (never increases)
- Rollover unused images (up to 5)
- Free re-edits
- Priority turnaround (Premium: 24hr)

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI Models:** Gemini Banana Pro (FAL.ai)
- **Payments:** Stripe (subscriptions + one-time)
- **Email:** Resend
- **Monitoring:** Sentry

## Getting Started

### Prerequisites
- Node.js 20+
- Supabase CLI
- Stripe account

### Installation

```bash
# Clone the repository
git clone https://github.com/nicholsmindset/dish-transform.git
cd dish-transform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Environment Variables

```bash
# Frontend (.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SENTRY_DSN=your-sentry-dsn

# Edge Functions (set in Supabase Dashboard)
FAL_KEY=your-fal-api-key
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
LOVABLE_API_KEY=your-lovable-key
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run build:staging # Staging build
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
npm run lint         # ESLint check
npm run typecheck    # TypeScript type check
```

## Project Structure

```
dish-transform/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions
│   ├── integrations/   # Supabase client
│   └── test/           # Test setup and utilities
├── supabase/
│   ├── functions/      # Edge Functions
│   │   ├── enhance-food-photo/
│   │   ├── create-checkout/
│   │   ├── verify-payment/
│   │   ├── stripe-webhook/
│   │   ├── send-email/
│   │   └── ...
│   └── migrations/     # Database migrations
├── public/             # Static assets
└── scripts/            # Utility scripts
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Supabase Functions

```bash
# Deploy all functions
supabase functions deploy --all

# Run database migrations
supabase db push
```

### Stripe Setup

```bash
# Create Stripe products
chmod +x scripts/create-stripe-products.sh
STRIPE_SECRET_KEY=sk_live_xxx ./scripts/create-stripe-products.sh
```

Configure webhook endpoint:
- URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

## API Reference

### Edge Functions

| Function | Auth | Description |
|----------|------|-------------|
| `enhance-food-photo` | No | AI photo enhancement |
| `create-checkout` | JWT | Create Stripe checkout |
| `verify-payment` | No | Verify payment status |
| `stripe-webhook` | No | Handle Stripe webhooks |
| `send-email` | JWT | Send email notifications |
| `check-tokens` | JWT | Get token balance |
| `generate-dish-description` | No | AI menu descriptions |
| `resize-for-social` | No | Social media exports |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, email support@dishtransform.com or open an issue on GitHub.
