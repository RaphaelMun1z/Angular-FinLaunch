import { test, expect, Page, APIRequestContext } from '@playwright/test';

const mock = 'http://127.0.0.1:4310/financas/api';
const configure = (request: APIRequestContext, data: object) => request.post(`${mock}/__test/config`, { data });
const state = async (request: APIRequestContext) => (await request.get(`${mock}/__test/state`)).json();
const record = (page: Page, title: string) => page.locator('.item-list button.record').filter({ hasText: title });

test.beforeEach(async ({ page, request }) => {
  await request.post(`${mock}/__test/reset`, { data: {} });
  await page.addInitScript(() => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem('financeiro.access-token', `test.${payload}.test`);
  });
});

test('meta consulta detalhes atuais e salva o valor acumulado', async ({ page, request }) => {
  await configure(request, { staleLists: true });
  await page.goto('/metas-financeiras');
  const detail = page.waitForResponse(r => r.url().endsWith('/metas-financeiras/goal-1'));
  await record(page, 'Reserva').click();
  await detail;
  await expect(page.locator('app-finance-record-detail')).toContainText('700,00');
  await expect(page.getByRole('button', { name: 'Excluir meta financeira', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar meta', exact: true }).click();
  await expect(page.getByLabel('Valor acumulado (R$)')).toBeVisible();
  await page.getByLabel('Valor acumulado (R$)').fill('95000');
  await configure(request, { staleLists: false });
  const saved = page.waitForRequest(r => r.method() === 'PUT' && r.url().endsWith('/metas-financeiras/goal-1'));
  await page.getByRole('dialog').getByRole('button', { name: 'SALVAR', exact: true }).click();
  expect((await saved).postDataJSON().valorAcumulado).toBe(950);
  await expect.poll(async () => (await state(request)).goals[0].valorAcumulado).toBe(950);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('app-finance-record-detail')).toContainText('950,00');
});

test('orçamento consulta por ID, edita consumo, confirma exclusão e trata erro', async ({ page, request }) => {
  await page.goto('/categorias');
  await record(page, 'Alimentação').click();
  await page.locator('.category-detail-view').getByRole('button', { name: 'Orçamentos da categoria' }).click();
  const panel = page.locator('.category-budget-panel-inline');
  await expect(panel.getByRole('button', { name: 'Editar orçamento' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Excluir orçamento' })).toBeVisible();
  const loaded = page.waitForResponse(r => r.url().endsWith('/orcamentos/budget-1'));
  await panel.getByRole('button', { name: 'Editar orçamento' }).click();
  await loaded;
  await expect(panel.getByLabel('VALOR CONSUMIDO')).toHaveValue(/300,00/);
  await panel.getByLabel('VALOR CONSUMIDO').fill('45000');
  await panel.getByRole('button', { name: /SALVAR ALTERACOES/ }).click();
  await expect.poll(async () => (await state(request)).budgets[0].valorCorrente).toBe(450);
  await panel.getByRole('button', { name: 'Excluir orçamento' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  expect((await state(request)).requests.filter((r: any) => r.method === 'DELETE')).toHaveLength(0);
  await configure(request, { failBudgetDelete: true });
  await panel.getByRole('button', { name: 'Excluir orçamento' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Não foi possível excluir');
  expect((await state(request)).budgets).toHaveLength(1);
  await configure(request, { failBudgetDelete: false });
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page.locator('app-confirmation-dialog')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Excluir orçamento' })).toHaveCount(0);
  await expect(panel.getByRole('button', { name: /CRIAR ORÇAMENTO/ })).toBeVisible();
});

test('excluir usuário exige confirmação, conserva sessão no erro e encerra após sucesso', async ({ page, request }) => {
  await page.goto('/metas-financeiras');
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
  await page.getByRole('menuitem', { name: /Excluir minha conta/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Excluir minha conta' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  expect((await state(request)).requests.filter((r: any) => r.method === 'DELETE')).toHaveLength(0);
  await configure(request, { failUserDelete: true });
  await page.getByRole('button', { name: 'Abrir menu do usuário' }).click();
  await page.getByRole('menuitem', { name: /Excluir minha conta/ }).click();
  await dialog.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(dialog.getByRole('alert')).toContainText('recursos financeiros vinculados');
  expect(await page.evaluate(() => localStorage.getItem('financeiro.access-token'))).toBeTruthy();
  await configure(request, { failUserDelete: false });
  await dialog.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('financeiro.access-token'))).toBeNull();
});

test('voucher permite editar saldo e usar o cartão na movimentação', async ({ page, request }) => {
  await page.goto('/conta/account-1/cartoes-voucher/voucher-1');
  await page.getByRole('button', { name: 'Editar cartao', exact: true }).click();
  await expect(page.getByLabel('Saldo do voucher (R$)')).toBeVisible();
  await page.getByLabel('Saldo do voucher (R$)').fill('55000');
  await page.getByRole('button', { name: /SALVAR ALTERACOES/ }).click();
  await expect.poll(async () => (await state(request)).cards[0].saldoCorrente).toBe(550);
  await page.getByRole('button', { name: /NOVA MOVIMENTAÇÃO/ }).click();
  const aside = page.getByRole('dialog', { name: 'Registrar movimentação' });
  await aside.locator('input[value="SAIDA"]').check();
  await aside.locator('input[formControlName="amount"]').fill('2500');
  await aside.locator('.movement-category-trigger').click();
  await aside.getByRole('option').filter({ hasText: 'Alimentação' }).click();
  await aside.locator('.movement-payment-trigger').click();
  await aside.getByRole('option').filter({ hasText: 'Voucher' }).click();
  await expect(aside.getByLabel('Cartão voucher')).toBeVisible();
  await aside.getByLabel('Cartão voucher').selectOption('voucher-1');
  const sent = page.waitForRequest(r => r.method() === 'POST' && r.url().endsWith('/registros-de-movimentacao'));
  await aside.getByRole('button', { name: /SALVAR MOVIMENTAÇÃO/ }).click();
  expect((await sent).postDataJSON()).toMatchObject({ metodoPagamento: 'VOUCHER', cartaoId: 'voucher-1', valorTotal: 25 });
});

test('detalhes de conta e investimento são recarregados e ações estão visíveis no celular', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, endpoint, title, edit] of [
    ['/contas-bancarias/account-1', '/contas-bancarias/account-1', 'Excluir conta bancária', 'Editar conta'],
    ['/conta/account-1/investimentos/investment-1', '/investimentos/investment-1', 'Excluir investimento', 'Editar investimento'],
  ]) {
    // Cada recurso começa com a conta exigida pela navegação disponível.
    await request.post(`${mock}/__test/reset`, { data: {} });
    const fresh = page.waitForResponse(r => r.url().endsWith(endpoint));
    await page.goto(route);
    await fresh;
    await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: edit, exact: true })).toBeVisible();
    if (route.startsWith('/contas-bancarias')) {
      await page.getByRole('button', { name: title, exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
      await expect(record(page, 'Banco Teste')).toHaveCount(0);
    }
  }
});

test('parcelamento aceita 120, rejeita 121 e frações; calendário bloqueia datas futuras', async ({ page, request }) => {
  await page.goto('/conta/account-1/cartoes');
  await page.getByRole('button', { name: /NOVA MOVIMENTAÇÃO/ }).click();
  const aside = page.getByRole('dialog', { name: 'Registrar movimentação' });
  await aside.locator('input[value="SAIDA"]').check();
  await aside.locator('input[formControlName="amount"]').fill('10000');
  await aside.locator('.movement-category-trigger').click();
  await aside.getByRole('option').filter({ hasText: 'Alimentação' }).click();
  await aside.locator('.movement-payment-trigger').click();
  await aside.getByRole('option').filter({ hasText: 'Crédito' }).click();
  await aside.locator('select[formControlName="cardId"]').selectOption('credit-1');
  const installments = aside.locator('input[formControlName="installments"]');
  const save = aside.getByRole('button', { name: /SALVAR MOVIMENTAÇÃO/ });
  await installments.fill('121');
  await expect(save).toBeDisabled();
  await installments.fill('1.5');
  await expect(save).toBeDisabled();
  await installments.fill('120');
  await expect(save).toBeEnabled();
  await aside.getByRole('button', { name: 'Próximo mês' }).click();
  await expect(aside.locator('.date-picker-grid button:enabled')).toHaveCount(0);
  const sent = page.waitForRequest(r => r.method() === 'POST' && r.url().endsWith('/registros-de-movimentacao'));
  await save.click();
  expect((await sent).postDataJSON().quantidadeParcelas).toBe(120);
  await expect.poll(async () => (await state(request)).movements.length).toBe(1);
});

test('nova meta exibe campo acumulado e mantém o valor na criação', async ({ page, request }) => {
  await page.goto('/metas-financeiras');
  await page.getByRole('button', { name: 'Nova meta financeira', exact: true }).click();
  const form = page.locator('.investment-form');
  await form.getByLabel('Objetivo *').fill('Viagem');
  await form.getByLabel('Valor alvo (R$) *').fill('500000');
  await form.getByLabel('Valor acumulado (R$)').fill('20000');
  await form.getByRole('button', { name: 'Hoje' }).click();
  await form.getByRole('button', { name: /SALVAR META/ }).click();
  await expect.poll(async () => (await state(request)).goals.find((g: any) => g.objetivo === 'Viagem')?.valorAcumulado).toBe(200);
  await expect(form).toHaveCount(0);
  await expect(record(page, 'Viagem')).toBeVisible();
});

test('falha ao buscar detalhes bloqueia edição e permite tentar novamente', async ({ page, request }) => {
  await configure(request, { failDetail: true });
  await page.goto('/metas-financeiras/goal-1');
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excluir meta financeira', exact: true })).toBeDisabled();
  await configure(request, { failDetail: false });
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('button', { name: 'Excluir meta financeira', exact: true })).toBeEnabled();
});
