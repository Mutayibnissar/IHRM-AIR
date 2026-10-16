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

    await page.goto('http://127.0.0.1:8765/references.html', { waitUntil: 'networkidle' });
    assert.match(await page.locator('h1').innerText(), /Evidence & Sources/i);
    assert.equal(await page.locator('a[href^="https://www.ilo.org"]').count() > 0, true, 'source page should link to official ILO guidance');
    assert.equal((await page.locator('a[href^="https://www.oecd.org"]').count()) + (await page.locator('a[href^="https://doi.org"]').count()) > 0, true, 'source page should link to OECD guidance');

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
      if (workspace.path === 'planner.html') {
        await page.locator('#airBuildRevision').click();
        await page.waitForFunction(() => (document.getElementById('airRevisionSchedule')?.innerText || '').trim().length > 0, null, { timeout: 5000 });
      }
      if (workspace.path === 'tracker.html') {
        page.once('dialog', dialog => dialog.accept('5'));
        await page.locator('#airSessionLog').click();
        await page.waitForFunction(() => document.getElementById('airSessionCount')?.innerText === '1', null, { timeout: 5000 });
      }
      if (workspace.path === 'backup.html') {
        const downloadPromise = page.waitForEvent('download');
        await page.locator('#airExportData').click();
        const download = await downloadPromise;
        assert.equal(download.suggestedFilename().endsWith('.json'), true, 'backup should export a JSON file');
        await page.locator('#airImportFile').setInputFiles({
          name: 'ihrm-air-test-backup.json',
          mimeType: 'application/json',
          buffer: Buffer.from(JSON.stringify({ format: 'IHRM-AIR-backup', version: 1, items: { 'air-test-restore': 'restored' } }))
        });
        await page.waitForFunction(() => (document.getElementById('airDataMessage')?.textContent || '').includes('Backup restored'), null, { timeout: 5000 });
        assert.equal(await page.evaluate(() => localStorage.getItem('air-test-restore')), 'restored', 'backup restore should restore browser-local data');
      }
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

    await page.evaluate(() => localStorage.removeItem('air-mistake-notebook-v1'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.selectOption('#examUnit', '1');
    await page.selectOption('#examMode', 'practice');
    await page.locator('#startExam').click();
    await page.locator('#examQuestionArea .exam-option').first().waitFor({ state: 'visible', timeout: 10000 });
    const questionBank = await page.evaluate(() => fetch('data/question-bank.json').then(response => response.json()));
    const retryPrompt = (await page.locator('#examQuestionArea h3').innerText()).replace(/^\d+\.\s*/, '');
    const retryQuestion = questionBank.questions.find(item => item.prompt === retryPrompt);
    assert.ok(retryQuestion, 'rendered practice question should map to the structured bank');
    const correctIndex = retryQuestion.options.findIndex(option => option.id === retryQuestion.correctOptionId);
    const wrongIndex = correctIndex === 0 ? 1 : 0;
    await page.locator('#examQuestionArea .exam-option').nth(wrongIndex).click();
    await page.waitForFunction(() => document.getElementById('airMistakeCount')?.textContent.includes('1 saved'), null, { timeout: 5000 });
    await page.locator('#airMistakeList button').filter({ hasText: 'Retry this question' }).first().click();
    await page.waitForFunction(() => (document.getElementById('examSessionLabel')?.textContent || '').includes('Missed-question retry'), null, { timeout: 5000 });
    await page.waitForFunction(() => { const option = document.querySelector('#examQuestionArea .exam-option'); return option && !option.disabled; }, null, { timeout: 5000 });
    await page.locator('#examQuestionArea .exam-option').nth(correctIndex).click();
    await page.waitForFunction(() => Boolean(document.querySelector('#examQuestionArea .exam-option.correct')), null, { timeout: 5000 });

    // Deterministic scoring regression: answer every Unit 1 practice question correctly.
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.removeItem('air-exam-history'));
    await page.selectOption('#examUnit', '1');
    await page.selectOption('#examMode', 'practice');
    await page.locator('#startExam').click();
    const scoringBank = await page.evaluate(() => fetch('data/question-bank.json').then(response => response.json()));
    const unitQuestions = scoringBank.questions.filter(item => item.unitId === 1);
    assert.equal(unitQuestions.length, 8, 'Unit 1 should have eight questions');
    for (let index = 0; index < unitQuestions.length; index++) {
      const heading = page.locator('#examQuestionArea h3');
      await heading.waitFor({ state: 'visible', timeout: 10000 });
      const renderedPrompt = (await heading.innerText()).replace(/^\\d+\\.\\s*/, '');
      const record = scoringBank.questions.find(item => item.prompt === renderedPrompt);
      assert.ok(record && record.unitId === 1, 'rendered question should match Unit 1 structured record');
      const correctIndex = record.options.findIndex(option => option.id === record.correctOptionId);
      assert.ok(correctIndex >= 0, 'structured record should identify a correct option');
      await page.locator('#examQuestionArea .exam-option').nth(correctIndex).click();
      if (index < unitQuestions.length - 1) await page.locator('#examNext').click();
    }
    await page.locator('#examFinish').click();
    await page.waitForFunction(() => (document.querySelector('#examQuestionArea h3')?.innerText || '').includes('Results:'), null, { timeout: 5000 });
    assert.equal((await page.locator('#examQuestionArea h3').innerText()).includes('Results: 8 / 8 (100%)'), true, 'eight correct answers should produce a 100% score');
    const practiceHistory = await page.evaluate(() => JSON.parse(localStorage.getItem('air-exam-history') || '[]'));
    assert.equal(practiceHistory[0]?.correct, 8, 'practice history should record eight correct answers');
    assert.equal(practiceHistory[0]?.total, 8, 'practice history should record eight questions');
    assert.equal(practiceHistory[0]?.score, 100, 'practice history should persist the calculated score');

    // Mock exam completion and history persistence.
    await page.reload({ waitUntil: 'networkidle' });
    await page.selectOption('#examMode', 'mock');
    await page.selectOption('#examLength', '10');
    await page.locator('#startExam').click();
    await page.locator('#examQuestionArea .exam-option').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#examQuestionArea .exam-option').first().click();
    await page.locator('#examFinish').click();
    await page.waitForFunction(() => (document.querySelector('#examQuestionArea h3')?.innerText || '').includes('Results:'), null, { timeout: 5000 });
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('air-exam-history') || '[]'));
    assert.equal(history.some(item => item.mode === 'mock'), true, 'timed mock should be recorded in exam history');

    const swReady = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await Promise.race([navigator.serviceWorker.ready, new Promise(resolve => setTimeout(() => resolve(null), 8000))]);
      return Boolean(registration && registration.active);
    });
    assert.equal(swReady, true, 'PWA service worker should activate on the local test origin');
    await page.reload({ waitUntil: 'networkidle' });
    await page.context().setOffline(true);
    await page.goto('http://127.0.0.1:8765/practice.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#exam-centre').waitFor({ state: 'visible', timeout: 10000 });
    await page.context().setOffline(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
    const menu = page.locator('.site-nav-toggle').first();
    if (await menu.count()) {
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'mobile menu should expose its expanded state');
    }
    assert.deepEqual(pageErrors, [], 'pages should not raise uncaught JavaScript errors');
    console.log('PASS: browser smoke tests verified navigation, dedicated tools, question loading, answer/next flow, timed mock history, backup export/restore, mistake retry, planner/tracker actions, PWA offline navigation, mobile menu, and no uncaught page errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
