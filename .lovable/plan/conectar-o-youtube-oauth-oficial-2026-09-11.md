# Conectar o YouTube (OAuth oficial)

Você pediu os seis valores. Três você mesmo precisa criar no Google, um eu gero automaticamente e dois já existem no backend do app.

## De onde vem cada informação

| Informação | Quem fornece | Como obter |
| --- | --- | --- |
| `YOUTUBE_CLIENT_ID` | Você, no Google | Google Cloud Console → criar projeto → ativar "YouTube Data API v3" → Credenciais → Criar credencial → ID do cliente OAuth → tipo "Aplicativo da Web" |
| `YOUTUBE_CLIENT_SECRET` | Você, no Google | Mostrado junto com o ID do cliente na mesma tela |
| `YOUTUBE_REDIRECT_URI` | Definido pelo app | `https://tube-tick-flow.lovable.app/api/youtube/callback` — cole exatamente isso em "URIs de redirecionamento autorizados" no Google |
| `PLATFORM_CREDENTIALS_ENCRYPTION_KEY` | Eu gero | Chave aleatória criada e guardada com segurança, sem você digitar nada |
| `SUPABASE_URL` | Já configurado | Existe no backend do app; nada a fazer |
| `SUPABASE_SERVICE_ROLE_KEY` | Já configurado | Existe no backend do app. Por segurança, esse valor não é visível nem para você nem para mim |

Importante: no Google, na tela de consentimento, adicione seu e-mail como "usuário de teste" e inclua o escopo de upload do YouTube. Enquanto o app estiver em modo de teste, só as contas listadas conseguem conectar.

## O que eu faço depois

1. Gero a chave de criptografia (`PLATFORM_CREDENTIALS_ENCRYPTION_KEY`) automaticamente.
2. Abro um formulário seguro para você colar o ID do cliente e o segredo do Google, e salvo o endereço de retorno.
3. Confirmo na tela de Configurações que o botão "Conectar YouTube" fica ativo, faço o teste da conexão e reporto o resultado.

## Observação

Conectar a conta é só a ligação com o canal. O envio automático de vídeos para YouTube e TikTok continua não implementado nesta versão.

## Detalhes técnicos

- Os quatro valores são lidos apenas no servidor por `getYouTubeServerConfig()` em `src/lib/youtube/env.server.ts`; nenhum deles é exposto ao navegador nem recebe prefixo `VITE_`.
- Se o domínio publicado mudar, o redirect URI precisa ser atualizado no Google e no segredo do app.
- O refresh token é criptografado com a chave AES de 32 bytes e guardado em `platform_credentials`, tabela sem acesso para `anon`/`authenticated`.
