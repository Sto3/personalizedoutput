#!/bin/bash

# ============================================================
# Launch Preparation Script
# ============================================================
# Run this script to prepare for production launch.
# It will:
# 1. Run database migrations
# 2. Create admin user
# 3. Check Stripe configuration
# 4. Commit and deploy
# ============================================================

set -e

echo "🚀 Running Launch Preparation..."
echo ""
echo "============================================================"

# Step 1: Database Migrations
echo ""
echo "Step 1/4: Database Migrations"
echo "------------------------------------------------------------"
npx ts-node scripts/runMigrations.ts || echo "⚠️  Some migrations may need manual setup"

# Step 2: Create Admin User
echo ""
echo "Step 2/4: Admin User Setup"
echo "------------------------------------------------------------"
npx ts-node scripts/createAdminUser.ts || echo "⚠️  Admin user may need manual setup"

# Step 3: Check Stripe Configuration
echo ""
echo "Step 3/4: Stripe Configuration"
echo "------------------------------------------------------------"
npx ts-node scripts/checkStripeConfig.ts

# Step 4: Commit and Deploy
echo ""
echo "Step 4/4: Commit and Deploy"
echo "------------------------------------------------------------"

# Check for changes
if git diff --quiet && git diff --cached --quiet; then
    echo "No changes to commit."
else
    echo "Committing changes..."
    git add -A
    git commit -m "Launch prep: Admin auth, Stor chat, branded emails, promo videos

- Admin authentication with email-based recognition (persefit@outlook.com)
- Stor AI chat interface at /admin/chat
- Real-time purchase alerts and daily digest at 9am EST
- Newsletter system with bi-weekly sends (Tuesdays 10am EST)
- Branded dark-theme email templates (#1a0a1a, #E85A4F, #7C3AED)
- TikTok promo videos (Vision Board + Santa Message, 46s each)
- Fixed video timing (5-6s per scene)
- Supabase migration scripts
- Launch automation scripts

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
fi

echo "Pushing to origin/main..."
git push origin main

echo ""
echo "============================================================"
echo "✅ Launch Preparation Complete!"
echo "============================================================"
echo ""
echo "REMAINING MANUAL STEPS:"
echo ""
echo "1. 📧 Check persefit@outlook.com for password setup email"
echo "   → Click the link to set your admin password"
echo ""
echo "2. 🔐 If password email not received, visit:"
echo "   → https://personalizedoutput.com/admin/setup"
echo ""
echo "3. 💳 Switch Stripe to LIVE mode (if not already):"
echo "   → https://dashboard.render.com → Environment"
echo "   → Update STRIPE_SECRET_KEY to sk_live_..."
echo "   → Update STRIPE_PUBLISHABLE_KEY to pk_live_..."
echo ""
echo "4. 🧪 After deploy (~2-3 min), test a real purchase"
echo ""
echo "5. 📹 Download promo videos from:"
echo "   → outputs/social-campaign-v2/tiktok-promo-vision-board-newyear.mp4"
echo "   → outputs/social-campaign-v2/tiktok-promo-santa-message.mp4"
echo ""
echo "============================================================"
