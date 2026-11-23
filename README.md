# Feedback Nutri Hericles

Plataforma de acompanhamento semanal para pacientes. O paciente entra com e-mail e uma senha temporária, responde o check-in da semana e acompanha gráficos de evolução. O administrador cadastra pacientes, cria formulários e acompanha as respostas individualmente.

## Arquitetura

- Next.js 16 + React 19, compilados com Vinext para Cloudflare Workers
- Supabase Auth e Postgres
- Row Level Security (RLS) para impedir acesso entre pacientes
- Supabase Edge Function para cadastro administrativo de pacientes
- Cloudflare Workers para hospedagem

## Desenvolvimento local

Requer Node.js 22.13 ou superior.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Sem variáveis Supabase, a aplicação abre em modo demonstração. O painel administrativo pode ser acessado pelo link abaixo do formulário de login.

## Variáveis públicas

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Nunca exponha a chave `service_role` no frontend. Ela existe apenas no ambiente seguro das Edge Functions do Supabase.

## Banco de dados

A migration inicial está em `supabase/migrations/202611220001_initial_schema.sql`. Ela cria:

- perfis com papéis `admin` e `patient`;
- formulários e perguntas configuráveis;
- envios semanais;
- respostas e respostas por pergunta;
- políticas RLS para o paciente acessar somente os próprios registros;
- acesso administrativo condicionado ao papel armazenado no banco.

A função `supabase/functions/admin-create-patient` valida que o solicitante é administrador antes de criar um usuário. O telefone é usado somente como senha temporária e o sistema deve exigir a troca no primeiro acesso.

## Publicação no Cloudflare

Com o projeto conectado ao GitHub em Workers Builds:

- comando de build: `npm run build`
- comando de deploy: `npx wrangler deploy --config dist/server/wrangler.json`
- branch de produção: `main`

Adicione as duas variáveis públicas do Supabase nas configurações de build do Worker. O domínio sugerido é `feedback.clinicagirlaneferreira.com.br`.

## Verificações

```bash
npm run typecheck
npm run build
```

