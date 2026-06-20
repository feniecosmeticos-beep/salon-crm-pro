# Salon CRM Pro - comandos de instalacao

```powershell
npx.cmd create-next-app@latest salon-crm-pro --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes --disable-git
cd salon-crm-pro
npm.cmd install lucide-react react-hook-form zod recharts @supabase/supabase-js @tanstack/react-table xlsx
npx.cmd shadcn@latest init -d --base radix
npx.cmd shadcn@latest add button sheet separator
npm.cmd run dev
```

Se o PowerShell permitir scripts, os mesmos comandos podem ser usados como `npx` e `npm`.

Como alternativa com Corepack/pnpm:

```powershell
corepack.cmd pnpm install
corepack.cmd pnpm dev
```
