module.exports = {
  apps: [
    {
      name: "pay-financial-api",
      cwd: "/var/www/xspinweb-financial.xspin.mx/apps/api",
      script: "dist/server.js",
      env: {
        NODE_ENV: "production",
        API_PORT: "4000"
      }
    },
    {
      name: "pay-financial-web",
      cwd: "/var/www/xspinweb-financial.xspin.mx/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        WEB_PORT: "3000"
      }
    }
  ]
};
