# Pendencias do backend

Documento direto para adequar o backend ao consumo do front-end.

## Adicionar

### 1. Endpoint de lancamentos

```http
GET /contas-bancarias/{contaBancariaId}/lancamentos?dataInicial=YYYY-MM-DD&dataFinal=YYYY-MM-DD
```

Requisitos:

- receber `dataInicial` e `dataFinal` pela URL;
- tornar os dois parametros obrigatorios;
- filtrar pela conta bancaria e pelo usuario autenticado;
- retornar lista vazia quando nao houver resultados.

Resposta minima:

```json
[
  {
    "valor": 100.00,
    "dataLancamento": "2026-10-18",
    "descricao": "Compra"
  }
]
```

Retornar tambem, preferencialmente, `id`, `categoriaId`, `metodoPagamento`, `ehRecorrente`, `qntParcelas` e `contaBancariaId`.

### 2. Operacoes de edicao e exclusao

Adicionar `PUT` ou `PATCH` e `DELETE` para os recursos que possuem acao de editar/excluir no front:

- contas bancarias;
- cartoes;
- categorias;
- investimentos;
- movimentacoes;
- metas financeiras;
- orcamentos.

As respostas devem usar status consistente (`200` ou `204` em sucesso, `404` para recurso inexistente e `409` para conflito).

## Modificar

### 1. Cadastro de movimentacao

Endpoint:

```http
POST /contas-bancarias/{contaBancariaId}/registros-de-movimentacao
```

Aceitar este contrato:

```json
{
  "valorTotal": 100.00,
  "metodoPagamento": "PIX",
  "categoriaId": "uuid",
  "dataLancamento": "2026-10-18",
  "descricao": "Compra",
  "ehRecorrente": false,
  "cartaoId": "uuid"
}
```

Modificar as regras para:

- aceitar `valorTotal` positivo;
- aplicar entrada ou saida conforme o tipo da categoria (`ENTRADA` ou `SAIDA`);
- aceitar `quantidadeParcelas` somente quando `ehRecorrente` for `true`;
- exigir `cartaoId` quando `metodoPagamento` for `CARTAO_CREDITO` ou `CARTAO_DEBITO`;
- rejeitar ou ignorar `cartaoId` para outros metodos;
- usar a data atual quando `dataLancamento` nao for enviada;
- retornar o registro criado completo, incluindo `id`.

### 2. Sinal dos valores do extrato

Modificar a resposta de:

```http
GET /contas-bancarias/{contaBancariaId}/registros-de-movimentacao?dataInicial=...&dataFinal=...
```

Regra obrigatoria:

- entrada: `valorTotal` positivo;
- saida: `valorTotal` negativo.

O front envia o valor positivo no cadastro; o backend deve aplicar o sinal com base na categoria.

### 3. Enum de metodo de pagamento

Modificar o enum para usar exatamente:

```text
DINHEIRO
PIX
CARTAO_CREDITO
CARTAO_DEBITO
VOUCHER
OUTRO
```

Substituir `VOUNCHER` por `VOUCHER` caso esse valor exista.

### 4. Parametros de periodo

Modificar todos os endpoints de consulta por periodo para receber os filtros via URL:

```http
GET /contas-bancarias/{contaBancariaId}/registros-de-movimentacao?dataInicial=...&dataFinal=...
GET /contas-bancarias/{contaBancariaId}/lancamentos?dataInicial=...&dataFinal=...
GET /cartoes/{cartaoId}/faturas?dataInicial=...&dataFinal=...
```

Nao receber `dataInicial` e `dataFinal` no body.

Validar tambem que:

- as datas sao obrigatorias;
- o formato e `yyyy-MM-dd`;
- `dataInicial` nao pode ser posterior a `dataFinal`.

### 5. Resposta de orcamento

Modificar:

```http
POST /categorias-movimentacao/{categoriaId}/orcamentos
```

Para retornar JSON do recurso criado, preferencialmente com `201 Created`, e nao resposta textual vazia.

A resposta deve conter:

```json
{
  "id": "uuid",
  "mesReferencia": "2026-10",
  "valorLimite": 1000.00,
  "valorCorrente": 250.00,
  "categoria": "Alimentacao"
}
```

### 6. Respostas de criacao

Modificar os endpoints de criacao para sempre retornarem o recurso criado com `id`:

- `POST /contas-bancarias`;
- `POST /cartoes`;
- `POST /categorias-movimentacao`;
- `POST /investimentos`;
- `POST /metas-financeiras`;
- `POST /contas-bancarias/{id}/registros-de-movimentacao`;
- `POST /categorias-movimentacao/{id}/orcamentos`.

### 7. Validacao de investimentos

Modificar as validacoes de `POST /investimentos`:

- `categoria` obrigatoria;
- `jurosAoMes` obrigatorio;
- `dataInicio` com data atual como padrao;
- `valorInicial` e `valorCorrente` nao negativos;
- resposta contendo o `id` e os valores persistidos.

### 8. Formato de erros

Modificar as respostas `400` e `422` para um formato unico:

```json
{
  "localDateTime": "2026-10-18T18:47:12",
  "message": [
    "O valor total e obrigatorio",
    "A categoria e obrigatoria"
  ],
  "details": "uri=/contas-bancarias/uuid/registros-de-movimentacao"
}
```

Usar preferencialmente apenas o campo `message` para a lista de mensagens.

### 9. Isolamento por usuario

Modificar todos os endpoints que recebem IDs para validar a propriedade do recurso pelo usuario autenticado:

- conta bancaria;
- cartao;
- categoria;
- investimento;
- meta;
- movimentacao;
- fatura;
- orcamento.

Retornar `403` ou `404` quando o recurso nao pertencer ao usuario.

## Checklist final

- [ ] Adicionar `GET /contas-bancarias/{id}/lancamentos`.
- [ ] Adicionar edicao e exclusao dos recursos necessarios.
- [ ] Modificar cadastro de movimentacao para valor positivo e parcelas condicionais.
- [ ] Modificar sinal dos valores retornados pelo extrato.
- [ ] Modificar enum `VOUNCHER` para `VOUCHER`.
- [ ] Modificar filtros de periodo para query string.
- [ ] Modificar resposta de orcamento para JSON.
- [ ] Modificar respostas de criacao para retornar `id`.
- [ ] Modificar validacoes de investimentos.
- [ ] Modificar formato de erros.
- [ ] Modificar validacao de propriedade por usuario.
