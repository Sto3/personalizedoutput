# Stripe Production Switch - Step by Step

This guide covers switching from Stripe TEST mode to LIVE mode.

---

## Pre-Flight Checklist

Before switching to production:
- [ ] Stripe account is fully verified (identity, business info)
- [ ] Bank account connected for payouts
- [ ] Products and prices created in LIVE mode
- [ ] Webhook endpoint configured for LIVE mode

---

## OPTION 1: Manual Switch (Recommended)

### Step 1: Get Your Live Keys from Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Toggle OFF the "Test mode" switch in the header
3. Copy your **Live** keys:
   - Secret key: `sk_live_...`
   - Publishable key: `pk_live_...`

### Step 2: Create Webhook for Live Mode

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Make sure you're in **Live mode** (not test)
3. Click "Add endpoint"
4. Endpoint URL: `https://personalizedoutput.com/api/stripe/webhook`
5. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Click "Add endpoint"
7. Copy the webhook signing secret: `whsec_...`

### Step 3: Create Live Price IDs

1. Go to [Stripe Products](https://dashboard.stripe.com/products) (in Live mode)
2. Create each product with pricing:
   - Vision Board: $14.99 one-time
   - Thought Organizer: $19.99 one-time
   - Santa Message: $20.00 one-time
3. Copy each Price ID: `price_...`

### Step 4: Update Render Environment Variables

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your `personalizedoutput` service
3. Click "Environment" in the left sidebar
4. Update these variables:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (your live secret key) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` (your live publishable key) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (your live webhook secret) |
| `STRIPE_PRICE_VISION_BOARD` | `price_...` (Vision Board price ID) |
| `STRIPE_PRICE_THOUGHT_ORGANIZER` | `price_...` (Thought Organizer price ID) |
| `STRIPE_PRICE_SANTA` | `price_...` (Santa Message price ID) |

5. Click "Save Changes"
6. Wait for automatic redeploy (~2-3 minutes)

### Step 5: Verify

1. Visit https://personalizedoutput.com
2. Go through a product checkout
3. Verify the Stripe checkout shows "Pay" not "Test mode"
4. Complete a test purchase with a real card (refund after)

---

## OPTION 2: API-Based Switch (Advanced)

Use the Render API to update environment variables programmatically.

### Prerequisites

1. Get your Render API key from [Account Settings](https://dashboard.render.com/u/settings/api-keys)
2. Get your service ID (from the service URL: `dashboard.render.com/web/srv-XXXXX`)

### API Script

Create a script `scripts/switch-stripe-live.sh`:

```bash
#!/bin/bash

# Render API Configuration
RENDER_API_KEY="rnd_..."
SERVICE_ID="srv-..."

# Your Stripe LIVE keys (replace these!)
STRIPE_SECRET="sk_live_..."
STRIPE_PUBLISHABLE="pk_live_..."
STRIPE_WEBHOOK="whsec_..."

# Update each variable via API
update_env_var() {
  local key=$1
  local value=$2

  curl --request PUT \
    --url "https://api.render.com/v1/services/${SERVICE_ID}/env-vars/${key}" \
    --header "Accept: application/json" \
    --header "Authorization: Bearer ${RENDER_API_KEY}" \
    --header "Content-Type: application/json" \
    --data "{\"value\": \"${value}\"}"

  echo "Updated: ${key}"
}

# Execute updates
update_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET"
update_env_var "STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE"
update_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK"

echo ""
echo "Done! Render will auto-deploy with new variables."
```

Run with: `bash scripts/switch-stripe-live.sh`

---

## Quick Reference

### Test Mode Keys
- Start with `sk_test_` and `pk_test_`
- Payments don't process real money
- Use test card: `4242 4242 4242 4242`

### Live Mode Keys
- Start with `sk_live_` and `pk_live_`
- Payments process REAL money
- Requires verified Stripe account

### Webhook Endpoints
- **Test:** Same URL, but registered in Stripe Test mode
- **Live:** Same URL, but registered in Stripe Live mode
- Each mode has its own webhook secret!

---

## Rollback to Test Mode

To switch back to test mode:
1. Go to Render Environment settings
2. Replace live keys with test keys
3. Save and wait for redeploy

---

## Troubleshooting

### "No such price" Error
You're using a test mode price ID in live mode (or vice versa). Price IDs are mode-specific.

### Webhook Signature Verification Failed
You're using the wrong webhook secret. Test and Live webhooks have different secrets.

### "Your account cannot currently make live charges"
Your Stripe account isn't fully verified. Complete identity verification in Stripe Dashboard.

---

## Support

- Stripe Documentation: https://stripe.com/docs
- Render Documentation: https://render.com/docs
- Render API: https://api-docs.render.com
