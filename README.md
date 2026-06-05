# Pay Financial V2

Nueva version del sistema Pay Financial en Node.js.

## Estructura

```text
apps/
  api/      API Node/Express
  web/      Frontend Next.js
packages/
  db/       Prisma schema y cliente
```

## Primer Arranque

```bash
cp .env.example .env
npm install
npm run db:generate
npm run dev
```

La API queda preparada para correr en `http://localhost:5101`.
El frontend queda preparado para correr en `http://localhost:5100`.

## Referencia

Las reglas iniciales estan documentadas en `../docs/pay-financial-v2-blueprint.md`.
