#!/usr/bin/env bash
set -euo pipefail

APP_NAME="pay-financial"
APP_DIR="/var/www/xspinweb-financial.xspin.mx"
REPO_URL="https://github.com/xspinweb/xspinweb-financial.xspin.mx.git"
DOMAIN="pay.xspin.mx"
API_PORT="5101"
WEB_PORT="5100"
DB_NAME="pay_financial_v2"
DB_USER="pay_financial"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root."
  exit 1
fi

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "DB_PASSWORD is required. Example:"
  echo "DB_PASSWORD='use-a-long-password' bash deploy/setup-vps.sh"
  exit 1
fi

echo "==> Updating packages"
apt-get update

echo "==> Installing base packages"
apt-get install -y curl git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing PM2"
  npm install -g pm2
fi

echo "==> Preparing PostgreSQL database"
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
SQL

echo "==> Cloning or updating repository"
mkdir -p "$(dirname "${APP_DIR}")"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch origin main
  git -C "${APP_DIR}" reset --hard origin/main
else
  git clone "${REPO_URL}" "${APP_DIR}"
fi

if [[ -f "${APP_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${APP_DIR}/.env"
  set +a
fi

echo "==> Writing production env"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(openssl rand -hex 32)}"
cat > "${APP_DIR}/.env" <<EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?schema=public"
JWT_SECRET="${JWT_SECRET}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"
API_PORT="${API_PORT}"
WEB_PORT="${WEB_PORT}"
PUBLIC_API_URL="https://${DOMAIN}/api"
STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"
EOF

chmod 600 "${APP_DIR}/.env"
set -a
# shellcheck disable=SC1090
source "${APP_DIR}/.env"
set +a

echo "==> Installing app dependencies"
cd "${APP_DIR}"
npm install

echo "==> Generating Prisma client"
npm run db:generate

echo "==> Syncing database schema"
npm run db:push

echo "==> Building app"
npm run build

echo "==> Configuring PM2"
pm2 delete pay-financial-api >/dev/null 2>&1 || true
pm2 delete pay-financial-web >/dev/null 2>&1 || true
API_PORT="${API_PORT}" WEB_PORT="${WEB_PORT}" DATABASE_URL="${DATABASE_URL}" JWT_SECRET="${JWT_SECRET}" NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" NEXTAUTH_URL="${NEXTAUTH_URL}" GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}" PUBLIC_API_URL="${PUBLIC_API_URL}" STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY}" STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY}" STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET}" \
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root >/tmp/pm2-startup.txt
bash /tmp/pm2-startup.txt || true

echo "==> Configuring Nginx"
cp deploy/nginx/pay.xspin.mx.conf /etc/nginx/sites-available/pay.xspin.mx
ln -sf /etc/nginx/sites-available/pay.xspin.mx /etc/nginx/sites-enabled/pay.xspin.mx
nginx -t
systemctl reload nginx

echo "==> Requesting SSL certificate"
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "admin@xspin.mx" || true

echo "==> Done"
echo "App: https://${DOMAIN}"
echo "API health: https://${DOMAIN}/api/health"
