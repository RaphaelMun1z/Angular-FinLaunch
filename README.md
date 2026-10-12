# financeiro.

Interface de gestão financeira migrada para Angular 22.

## Execução

```bash
npm install
npm start
```

Para validar a compilação de produção:

```bash
npm run build
```

## Organização

- `src/app/core/models`: modelos e dados tipados.
- `src/app/core/store`: estado compartilhado com NgRx SignalStore.
- `src/app/features/finance`: shell da funcionalidade financeira.
- `src/app/shared/components`: componentes reutilizáveis, como o calendário.
- `src/styles.css`: identidade visual e responsividade preservadas.
