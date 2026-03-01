#!/usr/bin/env bash
# =============================================================================
# BudgetBolt — First-time server setup for Debian 13
# Run this ONCE on your home lab server before the first deploy.
#
# Usage:  curl -sSL <raw-url> | sudo bash
#   or:   sudo bash deploy/setup-server.sh
# =============================================================================
set -euo pipefail

DEPLOY_USER="deploy"
DEPLOY_PATH="/opt/budgetbolt"

echo "==> BudgetBolt Server Setup"
echo "    Target: $DEPLOY_PATH"
echo ""

# --- 1. Create deploy user (if needed) ---
if ! id "$DEPLOY_USER" &>/dev/null; then
  echo "==> Creating deploy user: $DEPLOY_USER"
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  echo "    Added $DEPLOY_USER to docker group"
else
  echo "==> User $DEPLOY_USER already exists"
  # Ensure they're in the docker group
  usermod -aG docker "$DEPLOY_USER" 2>/dev/null || true
fi

# --- 2. Enable Tailscale SSH for the deploy user ---
echo "==> Checking Tailscale status"
if command -v tailscale &>/dev/null; then
  echo "    Tailscale is installed"
  tailscale status --json | head -5
else
  echo "    WARNING: Tailscale not found. Install it first:"
  echo "    curl -fsSL https://tailscale.com/install.sh | sh"
  echo "    sudo tailscale up --ssh"
fi

# --- 3. Create app directory ---
echo "==> Creating $DEPLOY_PATH"
mkdir -p "$DEPLOY_PATH/data"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"

# --- 4. Verify Docker ---
echo "==> Checking Docker"
if command -v docker &>/dev/null; then
  docker --version
  docker compose version 2>/dev/null || echo "    WARNING: docker compose plugin not found"
else
  echo "    ERROR: Docker not found. Install it first."
  exit 1
fi

# --- 5. Open firewall port (if ufw is active) ---
if command -v ufw &>/dev/null && ufw status | grep -q "active"; then
  echo "==> Allowing port 5000 through UFW"
  ufw allow 5000/tcp
fi

echo ""
echo "==> Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. In your Tailscale admin console (https://login.tailscale.com/admin/settings/keys):"
echo "     - Create an OAuth client with 'devices:write' scope"
echo "     - Tag it with 'tag:ci'"
echo "  2. In your GitHub repo Settings > Secrets, add:"
echo "     - TS_OAUTH_CLIENT_ID  — OAuth client ID from step 1"
echo "     - TS_OAUTH_SECRET     — OAuth secret from step 1"
echo "  3. Push to main and the deploy workflow will handle the rest!"
echo ""
echo "  Your app will be available at:"
echo "    http://sandbox.tail6a8276.ts.net:5000"
echo ""
