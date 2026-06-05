const fs = require("fs");
const path = require("path");

const appDir = "/var/www/xspinweb-financial.xspin.mx";
const envPath = path.join(appDir, ".env");

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2];
    }
  }
}

module.exports = {
  apps: [
    {
      name: "pay-financial-api",
      cwd: `${appDir}/apps/api`,
      script: "dist/server.js",
      env: {
        NODE_ENV: "production",
        API_PORT: process.env.API_PORT || "5101",
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET
      }
    },
    {
      name: "pay-financial-web",
      cwd: appDir,
      script: "npm",
      args: `run start -w @pay-financial/web -- -p ${process.env.WEB_PORT || "5100"}`,
      env: {
        NODE_ENV: "production",
        WEB_PORT: process.env.WEB_PORT || "5100",
        PUBLIC_API_URL: process.env.PUBLIC_API_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
      }
    }
  ]
};
