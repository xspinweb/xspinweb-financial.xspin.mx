# Despliegue VPS

Plantillas iniciales para desplegar en el VPS de `xspin.mx`.

## Produccion Con PM2

Ruta sugerida:

```bash
/var/www/pay-financial-v2
```

Pasos conceptuales:

```bash
npm install
npm run db:generate
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

## Nginx

Copiar `deploy/nginx/pay.xspin.mx.conf` a:

```bash
/etc/nginx/sites-available/pay.xspin.mx
```

Luego:

```bash
ln -s /etc/nginx/sites-available/pay.xspin.mx /etc/nginx/sites-enabled/pay.xspin.mx
nginx -t
systemctl reload nginx
```

## SSL

Cuando el DNS del subdominio ya apunte al VPS:

```bash
certbot --nginx -d pay.xspin.mx
```
