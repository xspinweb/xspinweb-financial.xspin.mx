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
      cwd: "/var/www/xspinweb-financial.xspin.mx/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${process.env.WEB_PORT || "5100"}`,
      env: {
        NODE_ENV: "production",
        WEB_PORT: process.env.WEB_PORT || "5100",
        PUBLIC_API_URL: process.env.PUBLIC_API_URL
      }
    }
  ]
};
