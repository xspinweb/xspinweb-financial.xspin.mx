module.exports = {
  apps: [
    {
      name: "pay-financial-api",
      cwd: "/var/www/xspinweb-financial.xspin.mx/apps/api",
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
      cwd: "/var/www/xspinweb-financial.xspin.mx",
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
