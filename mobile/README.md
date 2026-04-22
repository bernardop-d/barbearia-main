# Barbearia App 💈

App mobile para gestão da barbearia e agendamento de clientes. Desenvolvido com React Native (Expo) e Supabase.

---

## O que o app faz

O app tem dois modos de uso:

### Para o cliente (público)
- Escolhe o serviço: Corte, Barba ou Combo
- Seleciona a data e um horário disponível
- Informa o nome e WhatsApp (opcional)
- Recebe a confirmação do agendamento na tela

### Para o barbeiro (admin)
- Login com email e senha
- **Dashboard** — faturamento total, faturamento do mês, agendamentos de hoje, confirmados e finalizados
- **Agenda** — lista completa de agendamentos com filtros por status e busca por nome/serviço
  - Expandir cada agendamento para: finalizar, cancelar, marcar como pago, editar, remover
  - Atalho de WhatsApp com mensagem pronta para o cliente
  - Alerta automático quando falta menos de 1h para um horário confirmado
- **Novo agendamento** — criar agendamento diretamente pelo app

---

## Baixar o app no Android

### Opção 1 — Download direto (recomendado)

O APK é gerado automaticamente toda vez que o código é atualizado no GitHub.

1. Acesse [expo.dev](https://expo.dev) e faça login na conta da barbearia
2. Clique em **Projects → barbearia → Builds**
3. Abra o build mais recente e clique em **Download**
4. Abra o arquivo `.apk` no celular e instale

> Na primeira instalação, o Android vai pedir para habilitar **"Instalar de fontes desconhecidas"** — é só confirmar nas configurações que aparecem.

---

### Opção 2 — Expo Go (para testes rápidos, precisa de Wi-Fi)

Se quiser testar sem instalar o APK:

1. Baixe o app **Expo Go** na Play Store
2. No computador, dentro da pasta do projeto, rode:
   ```
   npx expo start
   ```
3. Escaneie o QR Code com o Expo Go

---

## Como gerar um novo APK

O APK é gerado automaticamente ao fazer push para o branch `main` no GitHub. Mas também pode ser disparado manualmente:

1. Acesse o repositório no GitHub
2. Vá em **Actions → Build Android APK**
3. Clique em **Run workflow → Run workflow**
4. Aguarde ~10 minutos
5. Baixe o APK pelo [expo.dev](https://expo.dev/builds)

---

## Configuração inicial (apenas uma vez)

Caso precise configurar do zero em outro computador:

### Pré-requisitos
- [Node.js 20+](https://nodejs.org)
- Conta grátis em [expo.dev](https://expo.dev)
- Conta no [GitHub](https://github.com)

### Passos

**1. Clonar o repositório**
```bash
git clone https://github.com/SEU_USUARIO/barbearia-app.git
cd barbearia-app
npm install
```

**2. Criar o token Expo**
- Acesse [expo.dev](https://expo.dev) → Account Settings → Access Tokens
- Crie um token com o nome `EXPO_TOKEN`
- Copie o valor gerado

**3. Adicionar o token ao GitHub**
- No repositório: **Settings → Secrets and variables → Actions → New secret**
- Nome: `EXPO_TOKEN`
- Valor: o token copiado no passo anterior

**4. Fazer o primeiro push**
```bash
git add .
git commit -m "initial"
git remote add origin https://github.com/SEU_USUARIO/barbearia-app.git
git push -u origin main
```

O build será iniciado automaticamente no GitHub Actions.

---

## Tecnologias

| Tecnologia | Uso |
|---|---|
| React Native + Expo SDK 54 | App mobile |
| Supabase | Banco de dados e autenticação |
| React Navigation | Navegação entre telas |
| EAS Build | Compilação do APK na nuvem |
| GitHub Actions | CI/CD automático |

---

## Estrutura do projeto

```
src/
├── context/AuthContext.js       — Autenticação
├── services/supabase.js         — Conexão com banco de dados
├── constants/index.js           — Serviços, status, horários
├── theme.js                     — Cores e estilos globais
└── screens/
    ├── LoginScreen.js            — Login do barbeiro
    ├── DashboardScreen.js        — Métricas e próximos agendamentos
    ├── AgendaScreen.js           — Lista de agendamentos
    ├── AgendamentoFormScreen.js  — Criar / editar agendamento
    ├── BookingScreen.js          — Agendamento público
    └── BookingSuccessScreen.js   — Confirmação do agendamento
```

---

## Links

| URL | Descrição |
|-----|-----------|
| [Site de agendamento (clientes)](https://bernardop-d.github.io/barbearia-main/booking/) | Clientes usam esse link para marcar horário |
| [Painel de gestão web (barbeiro)](https://bernardop-d.github.io/barbearia-main/) | Versão web para gerenciar agendamentos |

### Acesso ao painel de gestão
- **Login:** admin@teste.com
- **Senha:** adminadmin

---

## Observações

- O app **requer conexão com a internet** — os dados ficam no Supabase (nuvem)
- Funciona em qualquer rede (Wi-Fi, 4G, 5G)
- O mesmo banco de dados é compartilhado com a versão web da barbearia
- Agendamentos feitos pelo app aparecem no painel web e vice-versa