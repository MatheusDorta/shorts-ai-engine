# Corrigir o erro recorrente no login publicado

## Diagnóstico confirmado

- O login do preview local abre normalmente e a configuração está disponível no ambiente atual.
- O site publicado em `tube-tick-flow.lovable.app/auth` ainda exibe a tela “Deployment configuration required”.
- Portanto, o problema está na versão publicada: ela foi gerada sem incorporar a URL e a chave pública do backend no JavaScript enviado ao navegador.

## Plano

1. Ajustar a resolução da configuração pública para usar a configuração gerenciada do projeto de forma compatível com preview e publicação, mantendo chaves privadas somente no servidor.
2. Preservar uma mensagem de erro segura caso a configuração realmente esteja indisponível, sem criar ou trocar o banco existente.
3. Atualizar os testes da configuração para cobrir o ambiente publicado e impedir que o erro volte.
4. Validar `/auth` e uma página protegida no preview, incluindo carregamento, login e ausência de erros no navegador.
5. Conferir o resultado da compilação e publicar a correção no endereço atual.
6. Abrir o `/auth` publicado em uma sessão nova e confirmar que o formulário de login aparece no lugar do aviso.

## Limites de segurança

- Nenhuma chave privada será exposta no navegador.
- O banco e os dados existentes serão preservados.
- A integração do YouTube e seus segredos não serão alterados.
