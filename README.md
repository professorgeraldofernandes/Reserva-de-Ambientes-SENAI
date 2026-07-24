# Reserva de Ambientes SENAI

Sistema web responsivo e instalável para gestão, consulta e impressão das reservas de ambientes escolares da Escola SENAI Ricardo Figueiredo Terra — CFP 5.69 — Paulínia/SP.

## Recursos implementados

- painel com indicadores de ocupação;
- cadastro de reservas por data, ambiente, turno e período;
- prevenção de conflito no mesmo ambiente e horário;
- consulta por mês, ambiente e turno;
- cadastro inicial dos 25 ambientes da planilha institucional;
- agenda mensal por ambiente preparada para impressão A4 em paisagem;
- calendário de eventos institucionais;
- armazenamento local para funcionamento imediato;
- PWA com cache offline básico;
- estrutura preparada para Firebase Hosting, Authentication e Firestore;
- regras iniciais de acesso por função: master, administrador, coordenador e professor.

## Executar localmente

```bash
npm install
npm run dev
```

## Gerar versão de produção

```bash
npm run build
npm run preview
```

## Arquitetura planejada

A primeira versão utiliza `localStorage` para permitir testes sem configuração externa. A próxima etapa substituirá a persistência local pelas coleções do Firestore:

- `users`;
- `environments`;
- `reservations`;
- `institutionalEvents`;
- `auditLogs`.

## Próximas entregas

1. autenticação Firebase e RBAC;
2. persistência em Firestore;
3. importação da planilha de 2026;
4. reservas recorrentes;
5. cadastro administrativo de usuários, turmas e unidades curriculares;
6. relatórios e dashboard de ocupação;
7. QR Code para agenda pública do ambiente;
8. aprovação de reservas e notificações.
