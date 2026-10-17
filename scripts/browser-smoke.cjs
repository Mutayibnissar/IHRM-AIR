'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push({ url: page.url(), message: error.message, stack: error.stack }));

    console.log('SMOKE CHECKPOINT: home + global navigation');
    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
    assert.match(await page.title(), /IHRM Air/i);
    assert.equal(await page.locator('a[href="units.html"]').count() > 0, true, 'home should link to course units');

    // Premium global navigation regression: command palette and scroll affordances.
    await page.keyboard.press('Control+k');
    await page.locator('#airCommandPalette').waitFor({ state: 'visible', timeout: 3000 });
    await page.locator('#airCommandInput').fill('planner');
    assert.equal(await page.locator('#airCommandResults a[href="planner.html"]').count(), 1, 'command palette should filter to the planner page');
    await page.keyboard.press('Escape');
    await page.locator('#airCommandPalette').waitFor({ state: 'hidden', timeout: 3000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => { const max = document.documentElement.scrollHeight - window.innerHeight; window.scrollTo(0, Math.max(0, max)); window.dispatchEvent(new Event('scroll')); });
    await page.waitForFunction(() => document.getElementById('siteBackTop')?.classList.contains('is-visible') || document.documentElement.scrollHeight <= window.innerHeight, null, { timeout: 5000 });
    const scrollMetrics = await page.evaluate(() => ({ max: document.documentElement.scrollHeight - window.innerHeight, progress: parseFloat(document.querySelector('#siteReadingProgress span')?.style.width || '0'), visible: document.getElementById('siteBackTop')?.classList.contains('is-visible') }));
    if (scrollMetrics.max > 0) {
      assert.equal(scrollMetrics.progress >= 90, true, 'reading progress should reflect page scroll');
      assert.equal(scrollMetrics.visible, true, 'back-to-top should appear after scrolling');
      await page.locator('#siteBackTop').evaluate(el => el.click());
      await page.waitForFunction(() => window.scrollY < 20, null, { timeout: 5000 });
    }

    console.log('SMOKE CHECKPOINT: course units');
    await page.goto('http://127.0.0.1:8765/units.html', { waitUntil: 'networkidle' });
    for (const unit of ['#u1', '#u2', '#u3', '#u4']) {
      assert.equal(await page.locator(unit).count() > 0, true, 'course notes should include ' + unit);
    }

    console.log('SMOKE CHECKPOINT: references');
    await page.goto('http://127.0.0.1:8765/references.html', { waitUntil: 'networkidle' });
    assert.match(await page.locator('h1').innerText(), /Evidence & Sources/i);
    assert.equal(await page.locator('a[href^="https://www.ilo.org"]').count() > 0, true, 'source page should link to official ILO guidance');
    assert.equal((await page.locator('a[href^="https://www.oecd.org"]').count()) + (await page.locator('a[href^="https://doi.org"]').count()) > 0, true, 'source page should link to OECD guidance');

    console.log('SMOKE CHECKPOINT: tools hub');
    await page.goto('http://127.0.0.1:8765/tools.html', { waitUntil: 'networkidle' });
    for (const target of ['planner.html', 'tracker.html', 'backup.html']) {
      assert.equal(await page.locator('a[href="' + target + '"]').count() > 0, true, 'tools hub should link to ' + target);
    }

    console.log('SMOKE CHECKPOINT: planner');
    await page.goto('http://127.0.0.1:8765/planner.html', { waitUntil: 'networkidle' });
    await page.locator('#planForm').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#examDate').fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await page.locator('#dailyMinutes').fill('60');
    await page.locator('#planForm button[type="submit"]').click();
    await page.waitForFunction(() => (document.getElementById('planTasks')?.innerText || '').includes('Review core concepts'), null, { timeout: 5000 });
    assert.ok(await page.locator('#planTasks [data-task]').count() > 0, 'planner should generate tasks');
    await page.locator('#planTasks input[type="checkbox"]').first().check();
    assert.match(await page.locator('#planSummary').innerText(), /1 completed/, 'planner should persist task completion');

    console.log('SMOKE CHECKPOINT: tracker');
    await page.goto('http://127.0.0.1:8765/tracker.html', { waitUntil: 'networkidle' });
    await page.locator('#timerDisplay').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await page.locator('#timerDisplay').innerText(), '25:00', 'focus timer should initialise');
    await page.locator('#timerPreset').selectOption('15');
    assert.equal(await page.locator('#timerDisplay').innerText(), '15:00', 'timer preset should update');
    await page.locator('#finishTimer').click();
    assert.match(await page.locator('#sessionCount').innerText(), /0 sessions/, 'unstarted timer should not create a session');
    await page.locator('#startTimer').click();
    await page.waitForTimeout(1200);
    await page.locator('#pauseTimer').click();
    await page.locator('#finishTimer').click();
    assert.match(await page.locator('#sessionCount').innerText(), /1 sessions/, 'paused focus session should save elapsed time');

    console.log('SMOKE CHECKPOINT: backup and restore');
    await page.goto('http://127.0.0.1:8765/backup.html', { waitUntil: 'networkidle' });
    await page.locator('#exportBackup').waitFor({ state: 'visible', timeout: 10000 });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportBackup').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename().endsWith('.json'), true, 'backup should export JSON');
    const backup = { app: 'IHRM Air', schemaVersion: 1, exportedAt: new Date().toISOString(), data: { 'air-study-plan-v1': JSON.stringify({tasks:[{id:'restored-task',title:'Restored task',unit:'1',date:'2026-10-16',minutes:25,done:false}]}) } };
    await page.locator('#backupFile').setInputFiles({ name: 'ihrm-air-test-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#importBackup').click();
    await page.waitForFunction(() => (document.getElementById('backupStatus')?.textContent || '').includes('Backup restored'), null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('air-study-plan-v1') || '{}').tasks?.[0]?.id), 'restored-task', 'backup restore should restore local data');

    console.log('SMOKE CHECKPOINT: practice question loading');
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

    console.log('SMOKE CHECKPOINT: deterministic scoring');
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
      const renderedPrompt = (await heading.innerText()).replace(/^[0-9]+[.] +/, '');
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

    console.log('SMOKE CHECKPOINT: mock exam history');
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

    console.log('SMOKE CHECKPOINT: Agent Crew');
    await page.goto('http://127.0.0.1:8765/agents.html', { waitUntil: 'networkidle' });
    await page.locator('#agentStatus').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => { const s = document.getElementById('agentStatus')?.textContent || ''; return /\bready\b/i.test(s) || /could not be loaded|unavailable/i.test(s); }, null, { timeout: 15000 });
    const agentStatusText = await page.locator('#agentStatus').innerText();
    assert.match(agentStatusText, /structured practice questions/i, 'Agent Crew should load its structured question bank');
    await page.locator('#mission').fill('prepare for my exam');
    await page.locator('#minutes').selectOption('25');
    await page.locator('#runMission').click();
    await page.waitForFunction(() => (document.getElementById('agentOutput')?.innerText || '').includes('study mission'), null, { timeout: 5000 });
    assert.equal(await page.locator('a[href="practice.html"]').count() > 0, true, 'Agent Crew should link back to practice');
 
    console.log('SMOKE CHECKPOINT: service worker/offline navigation');
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

    console.log('SMOKE CHECKPOINT: mobile navigation and final checks');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'networkidle' });
    const menu = page.locator('.site-nav-toggle').first();
    if (await menu.count()) {
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'mobile menu should expose its expanded state');
    }
    assert.deepEqual(pageErrors, [], 'pages should not raise uncaught JavaScript errors');
    console.log('PASS: browser smoke tests verified navigation, dedicated tools, question loading, answer/next flow, timed mock history, backup export/restore, mistake retry, planner/tracker actions, PWA offline navigation, command palette, reading progress, back-to-top, mobile menu, and no uncaught page errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
