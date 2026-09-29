import { test, expect, type Page } from '@playwright/test';

type Role = 'student' | 'parent' | 'staff' | 'admin';

const credentials: Record<Role, () => { email?: string; password?: string }> = {
  student: () => ({ email: process.env.PLAYWRIGHT_E2E_EMAIL, password: process.env.PLAYWRIGHT_E2E_PASSWORD }),
  parent: () => ({ email: process.env.PLAYWRIGHT_PARENT_EMAIL, password: process.env.PLAYWRIGHT_PARENT_PASSWORD }),
  staff: () => ({ email: process.env.PLAYWRIGHT_STAFF_EMAIL, password: process.env.PLAYWRIGHT_STAFF_PASSWORD }),
  admin: () => ({ email: process.env.PLAYWRIGHT_ADMIN_EMAIL, password: process.env.PLAYWRIGHT_ADMIN_PASSWORD }),
};

const routes: Record<Role, string[]> = {
  student: ['/menu', '/student/features', '/student/account', '/student/wallet', '/student/history', '/student/favorites', '/student/link-code', '/student/notifications', '/student/rewards', '/student/reviews'],
  parent: ['/parent/family', '/parent/food-controls', '/parent/wellbeing'],
  staff: ['/staff', '/staff/features', '/staff/orders', '/staff/verification'],
  admin: ['/admin', '/admin/features', '/admin/orders', '/admin/payments', '/admin/wallet', '/admin/inventory', '/admin/menu', '/admin/nutrition', '/admin/verification', '/admin/users', '/admin/loyalty', '/admin/reports', '/admin/history', '/admin/system', '/admin/operations', '/admin/rankings', '/admin/reset', '/admin/academic', '/admin/recess'],
};

function destination(role: Role) {
  if (role === 'student') return /\/menu$/;
  if (role === 'parent') return /\/parent\/family$/;
  if (role === 'staff') return /\/staff(?:\/)?$/;
  return /\/admin(?:\/)?$/;
}

async function installMonitors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const apiErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', async (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (!/\/v1\/|\/api\//.test(url)) return;
    let body = '';
    try {
      body = (await response.text()).slice(0, 500);
    } catch {
      body = '<unreadable>';
    }
    apiErrors.push(`${response.status()} ${response.request().method()} ${url} ${body}`);
  });

  return { consoleErrors, pageErrors, apiErrors };
}

async function loginAs(page: Page, role: Role) {
  const account = credentials[role]();
  test.skip(!account.email || !account.password, `Missing Playwright credentials for ${role}.`);
  await page.goto('/login');
  await page.locator('#login-email').fill(account.email!);
  await page.locator('#login-password').fill(account.password!);
  await page.getByRole('button', { name: /^iniciar sesi[oó]n$/i }).click();
  await page.waitForURL(destination(role), { timeout: 30_000 });
}

async function assertHealthy(page: Page, monitors: Awaited<ReturnType<typeof installMonitors>>) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/application error|uncaught|chunkloaderror|algo sali[oó] mal/i);
  expect(monitors.pageErrors).toEqual([]);
  expect(monitors.consoleErrors).toEqual([]);
  expect(monitors.apiErrors).toEqual([]);
}

for (const role of ['student', 'parent', 'staff', 'admin'] as const) {
  test.describe(`${role} interface`, () => {
    test(`${role} authenticates and opens its interface`, async ({ page }) => {
      const monitors = await installMonitors(page);
      await loginAs(page, role);
      await assertHealthy(page, monitors);
      await expect(page).toHaveURL(destination(role));
    });

    for (const route of routes[role]) {
      test(`${role} route ${route} loads cleanly`, async ({ page }) => {
        const monitors = await installMonitors(page);
        await loginAs(page, role);
        await page.goto(route);
        await assertHealthy(page, monitors);
        await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\\\/')}$`));
      });
    }
  });
}
