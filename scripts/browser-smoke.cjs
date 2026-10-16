'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push({ url: page.url(), message: error.message, stack: error.stack }));

    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
    assert.match(await page.title(), /IHRM Air/i);
    assert.equal(await page.locator('a[href="units.html"]').count() > 0, true, 'home should link to course units');

    await page.goto('http://127.0.0.1:8765/units.html', { waitUntil: 'networkidle' });
    for (const unit of ['#u1', '#u2', '#u3', '#u4']) {
      assert.equal(await page.locator(unit).count() > 0, true, 'course notes should include ' + unit);
    }

    await page.goto('http://127.0.0.1:8765/tools.html', { waitUntil: 'networkidle' });
    for (const target of ['planner.html', 'tracker.html', 'backup.html']) {
      assert.equal(await page.locator('a[href="' + target + '"]').count() > 0, true, 'tools hub should link to ' + target);
    }

    for (const workspace of [
      { path: 'planner.html', selector: '#air-study-intelligence' },
      { path: 'tracker.html', selector: '#air-study-session-tracker' },
      { path: 'backup.html', selector: '#airDataBackupPanel' }
    ]) {
      await page.goto('http://127.0.0.1:8765/' + workspace.path, { waitUntil: 'networkidle' });
      await page.locator(workspace.selector).waitFor({ state: 'visible', timeout: 10000 });
    }

    await page.goto('http://127.0.0.1:8765/practice.html', { waitUntil: 'networkidle' });
    const status = page.locator('#questionBankStatus');
    await status.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => {
      const el = document.getElementById('questionBankStatus');
      return el && /practice questions ready/i.test(el.textContent);
    }, { timeout: 10000 });
    await page.locator('#startExam').click();
    const firstOption = page.locator('#examQuestionArea .exam-option').first();
    await firstOption.waitFor({ state: 'visible', timeout: 10000 });
    const firstQuestion = await page.locator('#examQuestionArea h3').innerText();
    await firstOption.click();
    await page.locator('#examNext').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#examNext').isEnabled(), true, 'answering should enable Next');
    await page.locator('#examNext').click();
    await page.waitForFunction(previous => {
      const heading = document.querySelector('#examQuestionArea h3');
      return heading && heading.innerText !== previous;
    }, firstQuestion, { timeout: 5000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
    const menu = page.locator('.site-nav-toggle').first();
    if (await menu.count()) {
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'mobile menu should expose its expanded state');
    }
    assert.deepEqual(pageErrors, [], 'pages should not raise uncaught JavaScript errors');
    console.log('PASS: browser smoke tests verified home/tools navigation, structured question loading, answer/next flow, mobile menu, and no uncaught page errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
