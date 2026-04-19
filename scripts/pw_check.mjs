import { chromium } from 'playwright';

const base = process.env.FRONTEND_URL || 'http://localhost:5174';
const email = 'maria@example.com';
const password = 'secret12';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err?.stack || String(err)));
page.on('requestfailed', (req) => console.log('[requestfailed]', req.url(), req.failure()?.errorText));

await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
await page.getByPlaceholder('name@example.com').fill(email);
await page.getByPlaceholder('Минимум 6 символов').fill(password);
await page.getByRole('button', { name: 'Войти' }).click();
await page.waitForTimeout(1200);

await page.goto(`${base}/app/c/c_general`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

await page.screenshot({ path: 'tmp_channel.png', fullPage: true });
console.log('screenshot_written', 'tmp_channel.png');

await browser.close();
