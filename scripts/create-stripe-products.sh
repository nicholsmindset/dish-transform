#!/bin/bash
# Stripe Product Creation Script for Dish Transform
# Run this with your Stripe API key to create all products and prices
#
# Usage: STRIPE_SECRET_KEY=sk_live_xxx ./scripts/create-stripe-products.sh
#
# After running, update the price IDs in:
# - supabase/functions/create-checkout/index.ts
# - src/pages/Pricing.tsx

set -e

if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "Error: STRIPE_SECRET_KEY environment variable is required"
  echo "Usage: STRIPE_SECRET_KEY=sk_live_xxx ./scripts/create-stripe-products.sh"
  exit 1
fi

STRIPE_API="https://api.stripe.com/v1"
AUTH="Authorization: Bearer $STRIPE_SECRET_KEY"

echo "Creating Stripe products and prices for Dish Transform..."
echo "========================================================="

# Function to create product and price
create_product_with_price() {
  local name="$1"
  local description="$2"
  local price_cents="$3"
  local recurring="$4"
  local metadata_key="$5"
  local metadata_value="$6"

  echo ""
  echo "Creating: $name"

  # Create product
  product_response=$(curl -s -X POST "$STRIPE_API/products" \
    -H "$AUTH" \
    -d "name=$name" \
    -d "description=$description" \
    -d "metadata[$metadata_key]=$metadata_value")

  product_id=$(echo "$product_response" | grep -o '"id": "prod_[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$product_id" ]; then
    echo "  Error creating product: $product_response"
    return 1
  fi

  echo "  Product ID: $product_id"

  # Create price
  if [ "$recurring" = "true" ]; then
    price_response=$(curl -s -X POST "$STRIPE_API/prices" \
      -H "$AUTH" \
      -d "product=$product_id" \
      -d "unit_amount=$price_cents" \
      -d "currency=sgd" \
      -d "recurring[interval]=month")
  else
    price_response=$(curl -s -X POST "$STRIPE_API/prices" \
      -H "$AUTH" \
      -d "product=$product_id" \
      -d "unit_amount=$price_cents" \
      -d "currency=sgd")
  fi

  price_id=$(echo "$price_response" | grep -o '"id": "price_[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$price_id" ]; then
    echo "  Error creating price: $price_response"
    return 1
  fi

  echo "  Price ID: $price_id"
  echo "  ✓ Created successfully"

  # Store for summary
  echo "$name|$price_id" >> /tmp/stripe_prices.txt
}

# Clear previous run
rm -f /tmp/stripe_prices.txt

echo ""
echo "=== A La Carte Products ==="

create_product_with_price \
  "Single Image Enhancement" \
  "Professional enhancement for one dish photo with 3 style variations" \
  1750 \
  "false" \
  "images" \
  "1"

create_product_with_price \
  "5-Image Pack" \
  "5 professional dish photo enhancements - ideal for menu sections" \
  6750 \
  "false" \
  "images" \
  "5"

create_product_with_price \
  "10-Image Pack" \
  "10 professional dish photo enhancements - best for seasonal updates" \
  11000 \
  "false" \
  "images" \
  "10"

create_product_with_price \
  "Full Menu Makeover" \
  "Complete menu transformation with up to 30 professional images" \
  27500 \
  "false" \
  "images" \
  "30"

create_product_with_price \
  "Delivery Platform Refresh" \
  "GrabFood/Deliveroo/FoodPanda listing optimization - up to 20 images" \
  19000 \
  "false" \
  "images" \
  "20"

echo ""
echo "=== Subscription Products ==="

create_product_with_price \
  "Starter Plan" \
  "10 enhanced images per month with rollover and free re-edits" \
  9000 \
  "true" \
  "tier" \
  "starter"

create_product_with_price \
  "Growth Plan" \
  "20 enhanced images + 2 social posts per month with all perks" \
  16500 \
  "true" \
  "tier" \
  "growth"

create_product_with_price \
  "Premium Plan" \
  "40 enhanced images + 4 social posts + 24hr priority turnaround" \
  31500 \
  "true" \
  "tier" \
  "premium"

echo ""
echo "========================================================="
echo "✓ All products created successfully!"
echo ""
echo "=== PRICE IDs TO UPDATE IN CODE ==="
echo ""
cat /tmp/stripe_prices.txt | while IFS='|' read -r name price_id; do
  echo "$name: $price_id"
done

echo ""
echo "Update these in:"
echo "  - supabase/functions/create-checkout/index.ts"
echo "  - src/pages/Pricing.tsx"
echo ""

# Cleanup
rm -f /tmp/stripe_prices.txt
