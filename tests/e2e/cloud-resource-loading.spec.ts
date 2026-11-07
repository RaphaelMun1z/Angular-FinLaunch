import { test, expect, Page } from '@playwright/test';

const mock = 'http://127.0.0.1:4310/financas/api';
const cardPath = '/contas-bancarias/account-1/cartoes/credit-1';
const cardRoute = '/conta/account-1/cartoes/credit-1';
const detailPanel = (page: Page) => page.locator('app-finance-record-detail');

test.beforeEach(async ({ page, request }) => {
  await request.post(`${mock}/__test/reset`, { data: { invoiceDelay: 250, detailDelay: 150 } });
  await page.addInitScript(() => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem('financeiro.access-token', `test.${payload}.test`);
  });
});

test('cartão sem faturas encerra carregamento e permanece visível após recarregar a lista', async ({ page }) => {
  const invoiceRequests: string[] = [];
  page.on('request', req => { if (new URL(req.url()).pathname.endsWith(`${cardPath}/faturas`)) invoiceRequests.push(req.url()); });
  await page.goto('/conta/account-1/cartoes');
  await page.locator('.item-list button.record').filter({ hasText: 'Crédito teste' }).click();
  await expect(page).toHaveURL(new RegExp(`${cardRoute}(?:\\?|$)`));
  await expect(detailPanel(page).getByRole('heading', { name: 'Crédito teste' })).toBeVisible();
  await expect(detailPanel(page).locator('.resource-loading')).toHaveCount(0);
  await expect(detailPanel(page).getByRole('button', { name: 'Editar cartao' })).toBeEnabled();
  expect(invoiceRequests.length).toBeGreaterThan(0);
  expect(invoiceRequests.length).toBeLessThanOrEqual(2); // A navegação pode recriar o componente.
  const count = invoiceRequests.length;
  await page.getByRole('button', { name: 'Recarregar registros' }).click();
  await expect(page.locator('.list-resource-loading')).toBeVisible();
  await expect(detailPanel(page).getByRole('heading', { name: 'Crédito teste' })).toBeVisible();
  await expect(page.locator('.resource-loading')).toHaveCount(0);
  await expect(detailPanel(page).getByRole('heading', { name: 'Crédito teste' })).toBeVisible();
  expect(invoiceRequests).toHaveLength(count);
});

test('falha ao consultar faturas libera o painel e permite uma nova consulta manual', async ({ page, request }) => {
  await request.post(`${mock}/__test/config`, { data: { failInvoices: true } });
  const invoiceRequests: string[] = [];
  page.on('request', req => { if (new URL(req.url()).pathname.endsWith(`${cardPath}/faturas`)) invoiceRequests.push(req.url()); });
  await page.goto(`${cardRoute}/faturas`);
  await expect(detailPanel(page).getByRole('heading', { name: 'Crédito teste' })).toBeVisible();
  await expect(page.locator('.resource-loading')).toHaveCount(0);
  expect(invoiceRequests).toHaveLength(1);
  await request.post(`${mock}/__test/config`, { data: { failInvoices: false } });
  await detailPanel(page).getByRole('button', { name: /BUSCAR FATURAS/ }).click();
  await expect(page.locator('.resource-loading')).toHaveCount(0);
  await expect(detailPanel(page).getByText('Nenhuma fatura disponivel para este periodo.', { exact: true })).toBeVisible();
  expect(invoiceRequests).toHaveLength(2);
});

test('link de faturas preserva o período solicitado e não repete a consulta vazia', async ({ page }) => {
  const invoiceRequests: URL[] = [];
  page.on('request', req => { if (new URL(req.url()).pathname.endsWith(`${cardPath}/faturas`)) invoiceRequests.push(new URL(req.url())); });
  await page.goto(`${cardRoute}/faturas?dataInicial=2026-01-01&dataFinal=2026-03-31&consulta=faturas`);
  await expect(detailPanel(page).getByRole('heading', { name: 'Crédito teste' })).toBeVisible();
  await expect(page.locator('.resource-loading')).toHaveCount(0);
  await expect(detailPanel(page).getByLabel('Data inicial', { exact: true })).toHaveValue('2026-01-01');
  await expect(detailPanel(page).getByLabel('Data final', { exact: true })).toHaveValue('2026-03-31');
  expect(invoiceRequests).toHaveLength(1);
  expect(invoiceRequests[0].searchParams.get('dataInicial')).toBe('2026-01-01');
  expect(invoiceRequests[0].searchParams.get('dataFinal')).toBe('2026-03-31');
});

test('falha no detalhe da fatura não inicia tentativas automáticas sem fim', async ({ page, request }) => {
  await request.post(`${mock}/__test/config`, { data: { failInvoiceDetail: true } });
  const invoiceRequests: string[] = [];
  page.on('request', req => { if (new URL(req.url()).pathname.includes(`${cardPath}/faturas`)) invoiceRequests.push(req.url()); });
  await page.goto(`${cardRoute}/faturas/invoice-1`);
  await expect(detailPanel(page).getByRole('heading', { name: 'Crédito teste' })).toBeVisible();
  await expect(page.locator('.resource-loading')).toHaveCount(0);
  expect(invoiceRequests.filter(url => new URL(url).pathname.endsWith('/invoice-1'))).toHaveLength(1);
  expect(invoiceRequests.filter(url => new URL(url).pathname.endsWith('/faturas'))).toHaveLength(1);
});

test('resposta atrasada do cartão anterior não substitui as faturas do cartão selecionado', async ({ page, request }) => {
  const fixture = await (await request.get(`${mock}/__test/state`)).json();
  await request.post(`${mock}/__test/config`, { data: {
    cards: [...fixture.cards, { ...fixture.cards.find((card: { id: string }) => card.id === 'credit-1'), id: 'credit-2', apelido: 'Segundo crédito' }],
    invoices: [
      { id: 'invoice-1', cartaoDeCreditoId: 'credit-1', valorTotal: 111, dataReferencia: '2026-12', status: 'ABERTA' },
      { id: 'invoice-2', cartaoDeCreditoId: 'credit-2', valorTotal: 222, dataReferencia: '2026-12', status: 'ABERTA' },
    ],
    invoiceDelayByCard: { 'credit-1': 5000, 'credit-2': 250 },
  } });
  const firstRequest = page.waitForRequest(req => new URL(req.url()).pathname.endsWith(`${cardPath}/faturas`));
  const firstResponse = page.waitForResponse(res => new URL(res.url()).pathname.endsWith(`${cardPath}/faturas`));
  await page.goto('/conta/account-1/cartoes');
  await page.locator('.item-list button.record').filter({ hasText: 'Crédito teste' }).click();
  await firstRequest;
  await expect(page).toHaveURL(new RegExp(`${cardRoute}(?:\\?|$)`));
  await page.locator('.item-list button.record').filter({ hasText: 'Segundo crédito' }).click();
  await expect(detailPanel(page).getByRole('heading', { name: 'Segundo crédito' })).toBeVisible();
  await expect(detailPanel(page).locator('.overview-invoice-click-list')).toContainText('222,00');
  await (await firstResponse).finished();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.resource-loading')).toHaveCount(0);
  await expect(detailPanel(page).locator('.overview-invoice-click-list')).toContainText('222,00');
  await expect(detailPanel(page).locator('.overview-invoice-click-list')).not.toContainText('111,00');
});
