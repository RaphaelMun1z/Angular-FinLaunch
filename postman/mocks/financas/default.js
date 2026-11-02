// Fixture local baseada em BACKEND-CONTRACT.json, sem dados reais.
const http = require('node:http');
const month = new Date().toISOString().slice(0, 7);
const seed = () => ({
  accounts: [{ id: 'account-1', nomeDoBanco: 'Banco Teste', saldoCorrente: 900, creditoTotal: 2000, creditoRestante: 1500 }],
  categories: [{ id: 'category-1', nome: 'Alimentação', tipo: 'SAIDA', cor: '#ed3114', icone: 'restaurant' }],
  goals: [{ id: 'goal-1', objetivo: 'Reserva', valorAlvo: 5000, valorAcumulado: 700, dataConclusaoPrevista: '2027-12-31' }],
  investments: [{ id: 'investment-1', categoria: 'Reserva CDI', dataInicio: '2026-01-01', valorInicial: 1000, valorCorrente: 1200, jurosAoMes: 1 }],
  cards: [
    { id: 'voucher-1', contaBancariaId: 'account-1', apelido: 'Vale alimentação', tipoCartao: 'VOUCHER', tipoVoucher: 'VA_VR', saldoCorrente: 400, diaRecarga: 5, valorRecarga: 800 },
    { id: 'credit-1', contaBancariaId: 'account-1', apelido: 'Crédito teste', tipoCartao: 'CREDITO', limiteCredito: 2000, diaFechamento: 10, diaVencimento: 20 },
  ],
  budgets: [{ id: 'budget-1', categoria: 'Alimentação', mesReferencia: month, valorLimite: 1200, valorCorrente: 300 }],
  movements: [], requests: [], failUserDelete: false, failBudgetDelete: false, failDetail: false, detailDelay: 0, staleLists: false,
});

http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname.replace(/^\/api/, '');
  const method = req.method, body = req.body ?? {};
  const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  let state = await pm.state.get('financas.fixture');
  if (!state || path === '/__test/reset') {
    state = { ...seed(), ...(path === '/__test/reset' ? body : {}) };
    await pm.state.set('financas.fixture', state);
    if (path === '/__test/reset') return send(200, { ok: true });
  }
  if (path === '/__test/state') return send(200, state);
  if (path === '/__test/config') { Object.assign(state, body); await pm.state.set('financas.fixture', state); return send(200, { ok: true }); }
  state.requests.push({ method, path, body });
  await pm.state.set('financas.fixture', state);
  const persist = async value => { await pm.state.set('financas.fixture', state); send(200, value); };
  const fail = (status, message) => send(status, { message: [message], details: `uri=/api${path}` });
  if (path === '/auth/me') return method === 'DELETE' ? (state.failUserDelete ? fail(409, 'Existem recursos financeiros vinculados.') : persist({})) : send(200, { id: 'user-1', nomeCompleto: 'Usuário Teste', email: 'teste@example.test' });
  if (path === '/dashboard/periodos-com-historico') return send(200, { periodos: [month] });
  if (path === '/dashboard') return send(200, { mesReferencia: month, contas: state.accounts, metas: state.goals, investimentos: state.investments, orcamentos: state.budgets, ultimosLancamentos: [], proximasFaturas: [] });
  if (path.endsWith('/faturas') || path.endsWith('/lancamentos')) return send(200, []);
  if (path === '/telegram/vinculo') return send(200, { codigo: 'a'.repeat(64) });
  if (path === '/cartoes/account-1' && method === 'GET') return send(200, state.cards);
  const cardDetail = path.match(/^\/contas-bancarias\/[^/]+\/cartoes\/([^/]+)$/);
  if (/^\/contas-bancarias\/[^/]+\/registros-de-movimentacao$/.test(path)) {
    if (method === 'GET') return send(200, state.movements);
    if (!body.dataLancamento || body.dataLancamento > new Date().toISOString().slice(0, 10) || body.quantidadeParcelas > 120) return fail(400, 'Movimentação inválida.');
    if (['VOUCHER', 'CARTAO_CREDITO', 'CARTAO_DEBITO'].includes(body.metodoPagamento) && !body.cartaoId) return fail(400, 'Cartão obrigatório.');
    const created = { ...body, id: 'movement-1', contaBancariaId: 'account-1' }; state.movements.push(created); return persist(created);
  }
  const budget = path.match(/^\/categorias-movimentacao\/[^/]+\/orcamentos(?:\/([^/]+))?$/);
  const generic = path.match(/^\/(contas-bancarias|categorias-movimentacao|metas-financeiras|investimentos|cartoes)(?:\/([^/]+))?$/);
  let collection, id;
  if (cardDetail) { collection = 'cards'; id = cardDetail[1]; }
  else if (budget) { collection = 'budgets'; id = budget[1]; }
  else if (generic) { collection = { 'contas-bancarias': 'accounts', 'categorias-movimentacao': 'categories', 'metas-financeiras': 'goals', investimentos: 'investments', cartoes: 'cards' }[generic[1]]; id = generic[2]; }
  if (!collection) return fail(501, 'Endpoint não modelado nesta simulação.');
  const categoryView = item => ({ ...item, orcamento: state.budgets.find(b => b.mesReferencia === month) });
  if (method === 'GET' && !id) {
    let items = state[collection].map(item => collection === 'categories' ? categoryView(item) : { ...item });
    if (state.staleLists) items = items.map(item => ({ ...item, valorAcumulado: 0, valorCorrente: 0, saldoCorrente: 0 }));
    return send(200, items);
  }
  const item = id && state[collection].find(item => item.id === id);
  if (id && !item) return fail(404, 'Recurso não encontrado.');
  if (method === 'GET') {
    if (state.detailDelay) await new Promise(resolve => setTimeout(resolve, state.detailDelay));
    if (state.failDetail) return fail(503, 'Não foi possível consultar os detalhes.');
    return send(200, collection === 'categories' ? categoryView(item) : item);
  }
  if (method === 'DELETE') {
    if (collection === 'budgets' && state.failBudgetDelete) return fail(409, 'Não foi possível excluir o orçamento.');
    state[collection] = state[collection].filter(item => item.id !== id); return persist({});
  }
  if (method === 'POST' || method === 'PUT') {
    const values = collection === 'cards' ? { ...body, ...body.cartaoCredito, ...body.cartaoVoucher } : body;
    if (item) Object.assign(item, values);
    else state[collection].push({ ...values, id: `${collection}-${Date.now()}`, ...(collection === 'budgets' ? { mesReferencia: month, categoria: 'Alimentação' } : {}) });
    return persist(item ?? state[collection].at(-1));
  }
  return fail(501, 'Operação não modelada.');
}).listen(process.env.PORT || 4311);
