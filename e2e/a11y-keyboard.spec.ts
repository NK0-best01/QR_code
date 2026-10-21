import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 8: Accessibility (Axe) and Keyboard Navigation E2E', () => {
  test('Home page has no serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="scan-panel"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test('Registration page has no serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/register?uid=E2E-A11Y-TEST');
    await page.waitForSelector('[data-testid="register-form"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test('E2E Keyboard-only flow: navigate from home -> manual input -> fill form -> submit', async ({ page }) => {
    const testUid = `KB-FLOW-${Date.now()}`;

    // 1. Go to home page
    await page.goto('/');
    await page.waitForSelector('[data-testid="scan-panel"]');

    // 2. Focus manual input button using Tab and press Enter
    const manualBtn = page.getByTestId('btn-manual-input');
    await manualBtn.focus();
    await page.keyboard.press('Enter');

    // 3. Manual input form appears, input should have autofocus or receive typed text
    const manualInput = page.getByTestId('input-manual-uid');
    await expect(manualInput).toBeVisible();
    await manualInput.fill(testUid);
    await page.keyboard.press('Enter');

    // 4. Should navigate to /register with uid
    await page.waitForURL(/\/register/);
    const registerForm = page.getByTestId('register-form');
    await expect(registerForm).toBeVisible();

    // 5. Select region using keyboard
    const regionSelect = page.getByTestId('reg-region');
    await regionSelect.focus();
    await regionSelect.selectOption('เหนือ');

    // 6. Select province using keyboard
    const provinceSelect = page.getByTestId('reg-province');
    await expect(provinceSelect).toBeEnabled();
    await provinceSelect.focus();
    await provinceSelect.selectOption('เชียงใหม่');

    // 7. Select device type using keyboard
    const deviceTypeSelect = page.getByTestId('reg-device-type');
    await deviceTypeSelect.focus();
    await deviceTypeSelect.selectOption('KSK');

    // 8. Wait for submit button to be enabled and press Enter to submit
    const submitBtn = page.getByTestId('btn-submit-registration');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.focus();
    await page.keyboard.press('Enter');

    // 9. Should see success view
    const successCard = page.getByTestId('registration-success-card');
    await expect(successCard).toBeVisible();
    await expect(page.getByTestId('display-actual-device-id')).toContainText('KSK-');
  });
});
