# Despliegue VPS

Plantillas iniciales para desplegar en el VPS de `xspin.mx`.

## Produccion Con PM2

Ruta sugerida:

```bash
/var/www/xspinweb-financial.xspin.mx
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

## Instalacion Automatizada

En el VPS:

```bash
git clone https://github.com/xspinweb/xspinweb-financial.xspin.mx.git /var/www/xspinweb-financial.xspin.mx
cd /var/www/xspinweb-financial.xspin.mx
DB_PASSWORD='usa-una-contrasena-larga' bash deploy/setup-vps.sh
```

El script instala/verifica paquetes generales del servidor, prepara PostgreSQL, configura `.env`, ejecuta Prisma, levanta procesos con PM2, configura Nginx y solicita SSL para `pay.xspin.mx`.

Si el servidor ya tiene otros proyectos, PM2 y Nginx pueden convivir sin problema mientras cada proyecto use nombres y puertos distintos.
