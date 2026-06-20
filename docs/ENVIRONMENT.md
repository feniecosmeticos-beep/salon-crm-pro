# Salon CRM Pro — Guia de ambiente

> Última revisão: 19 de junho de 2026

## Arquivos locais

Use `.env.local` para desenvolvimento:

```powershell
Copy-Item .env.example .env.local
```

O `.env.example` contém somente nomes de variáveis e pode permanecer versionado. Nunca versione valores reais.

## Variáveis

### `NEXT_PUBLIC_SUPABASE_URL`

- URL do projeto Supabase.
- Obrigatória em produção e homologação.
- Pode aparecer no bundle do navegador.
- Exemplo: `https://<PROJECT_REF>.supabase.co`.

### `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

- Chave pública preferencial para browser e autenticação SSR.
- Obrigatória em produção, salvo uso temporário da chave anon legada.
- Pode aparecer no frontend; a segurança dos dados depende de autenticação e RLS.

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- Chave pública legada ainda suportada como fallback.
- O código prefere `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Não é necessário preencher as duas em uma instalação nova.
- Planeje remover o fallback legado quando todos os ambientes usarem publishable keys.

### `SUPABASE_SERVICE_ROLE_KEY`

- Chave secreta usada apenas no servidor.
- Obrigatória no comportamento atual de produção e homologação.
- Ignora RLS.
- Nunca use prefixo `NEXT_PUBLIC_`.
- Nunca exponha em componentes client-side, respostas HTTP, logs, screenshots ou suporte.
- Configure somente no cofre de segredos da plataforma de deploy e no `.env.local` protegido.
- Rotacione imediatamente se houver suspeita de exposição.

### `SALON_ID`

- Fallback exclusivamente local quando o Supabase não está configurado.
- Opcional em desenvolvimento.
- Não configure em produção ou homologação.
- O caminho principal resolve o salão pelo usuário autenticado e por `public.users.salon_id`.

## Configuração mínima por ambiente

### Desenvolvimento sem Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SALON_ID=11111111-1111-4111-8111-111111111111
```

Esse modo serve apenas para validar build e estados vazios controlados.

### Desenvolvimento ou homologação com Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY>
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
SALON_ID=
```

### Produção

Use as mesmas quatro variáveis do ambiente com Supabase, mantendo `SALON_ID` ausente. Separe projetos ou credenciais entre homologação e produção.

## Onde obter os valores

No painel do Supabase:

1. abra **Project Settings**;
2. localize a URL do projeto;
3. copie a publishable key, ou a anon key enquanto o fallback for necessário;
4. copie a service role somente para o ambiente server-side.

## Checklist de segurança

- [ ] `.env.local` não está versionado.
- [ ] A service role não usa prefixo público.
- [ ] O deploy não imprime segredos durante o build.
- [ ] Homologação e produção usam projetos ou credenciais separados.
- [ ] `SALON_ID` não está configurado em produção.
- [ ] URLs e chaves pertencem ao mesmo projeto Supabase.
- [ ] Após qualquer exposição, a chave afetada foi rotacionada.
