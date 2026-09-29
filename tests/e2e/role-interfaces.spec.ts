import { expect, test, type Page } from '@playwright/test';

type Role = 'student' | 'parent' | 'staff' | 'admin';
type RoleContract = {
  credentials: () => { email?: string; password?: string };
  home: RegExp;
  routes: string[];
  interfaceText: RegExp;
};

const roles: Record<Role, RoleContract> = {
  student: {
    credentials: () => ({ email: process.env.PLAYWRIGHT_E2E_EMAIL, password: process.env.PLAYWRIGHT_E2E_PASSWORD }),
    home: /\/menu$/,
    routes: ['/menu', '/student/features', '/student/account', '/student/wallet', '/student/history', '/student/favorites', '/student/link-code', '/student/notifications', '/student/rewards', '/student/reviews'],
    interfaceText: /QuickBite Student|Centro de funciones|Saldos y recargas|Mis favoritos|Notificaciones/i,
  },
  parent: {
    credentials: () => ({ email: process.env.PLAYWRIGHT_PARENT_EMAIL, password: process.env.PLAYWRIGHT_PARENT_PASSWORD }),
    home: /\/parent\/family$/,
    routes: ['/parent/family', '/parent/food-controls', '/parent/wellbeing'],
    interfaceText: /Mi familia|Controles alimentarios|Bienestar y límites/i,
  },
  staff: {
    credentials: () => ({ email: process.env.PLAYWRIGHT_STAFF_EMAIL, password: process.env.PLAYWRIGHT_STAFF_PASSWORD }),
    home: /\/staff\/?$/,
    routes: ['/staff', '/staff/features', '/staff/orders', '/staff/verification'],
    interfaceText: /QuickBite Staff|Centro de funciones|Pedidos operativos|Verificación de recogidas/i,
  },
  admin: {
    credentials: () => ({ email: process.env.PLAYWRIGHT_ADMIN_EMAIL, password: process.env.PLAYWRIGHT_ADMIN_PASSWORD }),
    home: /\/admin\/?$/,
    routes: ['/admin', '/admin/features', '/admin/operations', '/admin/rankings', '/admin/reviews', '/admin/orders', '/admin/payments', '/admin/wallet', '/admin/inventory', '/admin/menu', '/admin/nutrition', '/admin/verification', '/admin/users', '/admin/academic', '/admin/recess', '/admin/loyalty', '/admin/reports', '/admin/history', '/admin/system', '/admin/reset'],
    interfaceText: /QuickBite Admin|Centro de funcionalidades|Pedidos|Usuarios y roles|Estado del sistema/i,
  },
};

const roleEntries = Object.entries(roles) as Array<[Role, RoleContract]>;

function routeRegex(route: string) {
  return new RegExp(route.replaceAll('/', '\\/') + '(?:\\?.*)?$');
}

async function attachMonitors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const apiErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', async (response) => {
    if (response.status() < 400 || !/\/v1\/|\/api\//.test(response.url())) return;
    let body = '<unreadable>';
    try { body = (await response.text()).slice(0, 500); } catch { /* ignore unreadable body */ }
    apiErrors.push(response.status() + ' ' + response.request().method() + ' ' + response.url() + ' ' + body);
  });
  return { consoleErrors, pageErrors, apiErrors };
}

async function login(page: Page, role: Role) {
  const account = roles[role].credentials();
  test.skip(!account.email || !account.password, 'Missing Playwright credentials for ' + role + '.');
  await page.goto('/login');
  await page.locator('#login-email').fill(account.email!);
  await page.locator('#login-password').fill(account.password!);
  await page.getByRole('button', { name: /^iniciar sesi[oó]n$/i }).click();
  await page.waitForURL(roles[role].home, { timeout: 30000 });
}

async function assertHealthy(page: Page, role: Role, route: string, monitors: Awaited<ReturnType<typeof attachMonitors>>) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/application error|unexpected application error|uncaught|chunkloaderror|algo sali[oó] mal/i);
  await expect(page.locator('body')).toContainText(roles[role].interfaceText);
  expect(monitors.pageErrors, role + ' ' + route + ' page errors').toEqual([]);
  expect(monitors.consoleErrors, role + ' ' + route + ' console errors').toEqual([]);
  expect(monitors.apiErrors, role + ' ' + route + ' API errors').toEqual([]);
}

for (const entry of roleEntries) {
  const role = entry[0];
  const contract = entry[1];
  test.describe(role + ' interface contract', () => {
    test('authenticates and reaches the ' + role + ' home', async ({ page }) => {
      const monitors = await attachMonitors(page);
      await login(page, role);
      await assertHealthy(page, role, 'home', monitors);
      await expect(page).toHaveURL(contract.home);
    });

    test('opens every protected ' + role + ' route without runtime or API errors', async ({ page }) => {
      const monitors = await attachMonitors(page);
      await login(page, role);
      for (const route of contract.routes) {
        monitors.consoleErrors.length = 0;
        monitors.pageErrors.length = 0;
        monitors.apiErrors.length = 0;
        await page.goto(route);
        await assertHealthy(page, role, route, monitors);
        await expect(page).toHaveURL(routeRegex(route));
      }
    });
  });
}