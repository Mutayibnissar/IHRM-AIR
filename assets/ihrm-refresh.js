/* IHRM Air — unified, accessible navigation and theme helpers */
(function(){
  'use strict';
  var root=document.documentElement;
  var path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  var wrap=document.querySelector('.site-nav-wrap');
  var toggle=wrap&&wrap.querySelector('.site-nav-toggle');
  var nav=wrap&&wrap.querySelector('.site-page-nav');

  // Mark the current page and keep all navigation state in one controller.
  document.querySelectorAll('.site-page-nav a[data-page],.topnav a[data-page]').forEach(function(link){
    if((link.getAttribute('data-page')||'').toLowerCase()===path){link.setAttribute('aria-current','page');}
    else{link.removeAttribute('aria-current');}
  });

  // Keep the Agent Crew discoverable from every page that uses the shared navigation.
  if(nav&&!nav.querySelector('a[href="agents.html"]')){
    var agentLink=document.createElement('a');
    agentLink.href='agents.html';
    agentLink.textContent='🤖 Agent Crew';
    agentLink.setAttribute('data-page','agents.html');
    if(path==='agents.html')agentLink.setAttribute('aria-current','page');
    nav.appendChild(agentLink);
  }

  if(wrap&&toggle&&nav){
    toggle.setAttribute('aria-controls',nav.id||'sitePageNav');
    function closeMenu(restoreFocus){
      nav.classList.remove('is-open');
      wrap.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded','false');
      var label=toggle.querySelector('span');
      if(label)label.textContent='Menu';
      if(restoreFocus)toggle.focus();
    }
    toggle.addEventListener('click',function(){
      var open=toggle.getAttribute('aria-expanded')!=='true';
      toggle.setAttribute('aria-expanded',String(open));
      nav.classList.toggle('is-open',open);
      wrap.classList.toggle('nav-open',open);
      var label=toggle.querySelector('span');
      if(label)label.textContent=open?'Close menu':'Menu';
    });
    nav.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click',function(){closeMenu(false);});
    });
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true')closeMenu(true);
    });
    window.addEventListener('resize',function(){if(window.innerWidth>700)closeMenu(false);},{passive:true});
  }


  // Add subtle entrance motion to content cards without hiding content when JS fails.
  try{
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      var motionItems=document.querySelectorAll('main section, main article, .hero, .card, .unit-card, .tool-card, .feature-card, .destination-card, .panel, .question-card, .study-card');
      motionItems.forEach(function(el){
        if(!el.classList.contains('air-reveal'))el.classList.add('air-reveal');
      });
      document.body.classList.add('air-motion-ready');
    }
  }catch(e){}

  // Add a safe in-site Back control to secondary pages. If opened directly,
  // it returns to Home rather than sending the learner to an unrelated site.
  if(path!=='index.html'&&wrap&&!wrap.querySelector('.site-back-button')){
    var back=document.createElement('button');
    back.type='button';back.className='site-back-button';back.textContent='← Back';
    back.setAttribute('aria-label','Go back to the previous page');
    back.addEventListener('click',function(){
      var sameSite=false;
      try{sameSite=!!document.referrer&&new URL(document.referrer).origin===location.origin&&history.length>1;}catch(e){}
      if(sameSite)history.back();else location.href='index.html';
    });
    if(toggle)wrap.insertBefore(back,toggle);else wrap.insertBefore(back,wrap.firstChild);
  }

  // The pages already create the accessible theme button; reuse it to avoid
  // duplicate theme controls. Create one only if no theme button exists.
  var theme=wrap&&wrap.querySelector('.site-theme-toggle, .air-theme-toggle, #airThemeToggle');
  var saved='';
  try{saved=localStorage.getItem('ihrm-air-theme')||'';}catch(e){}
  if(saved==='dark'||saved==='light')root.setAttribute('data-theme',saved);
  if(!theme&&wrap){
    theme=document.createElement('button');theme.type='button';theme.className='air-theme-toggle';
    theme.setAttribute('aria-label','Switch colour theme');
    var target=nav||wrap;target.appendChild(theme);
  }
  if(theme){
    /* Keep Menu and Dark/Light side by side; do not bury the theme control in the collapsed menu. */
    if(wrap&&toggle&&theme.parentElement!==wrap){
      wrap.insertBefore(theme,nav||null);
      theme.classList.add('site-theme-toggle');
    }
    function paintTheme(){
      var dark=root.getAttribute('data-theme')==='dark';
      if(theme.id==='siteThemeToggle'||theme.classList.contains('site-theme-toggle'))theme.innerHTML=dark?'☀️ <span>Light</span>':'🌙 <span>Dark</span>';
      else theme.textContent=dark?'☀ Light':'☾ Dark';
      theme.setAttribute('aria-pressed',String(dark));
      theme.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
    }
    // Existing inline theme controller may already have a click handler.
    // Only attach a controller to buttons created here.
    if(theme.classList.contains('air-theme-toggle')&&theme.id!=='airThemeToggle'){
      theme.addEventListener('click',function(){
        root.setAttribute('data-theme',root.getAttribute('data-theme')==='dark'?'light':'dark');
        try{localStorage.setItem('ihrm-air-theme',root.getAttribute('data-theme'));}catch(e){}
        paintTheme();
      });
    }
    paintTheme();
  }

  // Site-wide quick navigator: searchable destinations and headings (Ctrl/Cmd + K).
  if(!document.getElementById('airCommandPalette')){
    var palette=document.createElement('div');
    palette.id='airCommandPalette';palette.className='air-command-overlay';palette.hidden=true;
    palette.innerHTML='<section class="air-command-box" role="dialog" aria-modal="true" aria-labelledby="airCommandTitle"><div class="air-command-head"><div><p class="air-command-kicker">IHRM AIR · QUICK NAVIGATION</p><h2 id="airCommandTitle">Where would you like to go?</h2></div><button type="button" id="airCommandClose" class="air-command-close" aria-label="Close search">×</button></div><label class="air-command-input-wrap"><span aria-hidden="true">⌕</span><input id="airCommandInput" type="search" placeholder="Search pages and topics…" autocomplete="off"></label><p class="air-command-hint">Tip: press Ctrl/⌘ + K to open · Esc to close</p><div id="airCommandResults" class="air-command-results" role="listbox" aria-label="Navigation results"></div></section>';
    document.body.appendChild(palette);
    var input=palette.querySelector('#airCommandInput'),results=palette.querySelector('#airCommandResults'),close=palette.querySelector('#airCommandClose');
    var destinations=[
      {label:'Home / Flight deck',detail:'Overview and study progress',href:'index.html',terms:'home dashboard progress'},
      {label:'Course Units',detail:'Four units and full study notes',href:'units.html',terms:'units notes learning course'},
      {label:'Practice & Exam Centre',detail:'MCQs, mocks and answer review',href:'practice.html',terms:'practice mcq quiz mock exam test'},
      {label:'Study Tools',detail:'Focus timer, notes, checklist and recall',href:'tools.html',terms:'tools timer notes checklist recall'},
      {label:'Evidence & Sources',detail:'Core IHRM text and official labour guidance',href:'references.html',terms:'sources references bibliography academic research ILO OECD scholar'}
    ];
    var items=destinations.slice();
    document.querySelectorAll('main h1,main h2,main h3,section h1,section h2,section h3').forEach(function(h){
      var label=(h.innerText||h.textContent||'').replace(/\s+/g,' ').trim();
      if(label.length>2&&h.id&&!items.some(function(it){return it.href==='#'+h.id;})){
        items.push({label:label,detail:'Topic on this page',href:'#'+h.id,terms:label.toLowerCase()});
      }
    });
    function render(q){
      results.textContent='';
      var query=(q||'').trim().toLowerCase();
      var matches=items.filter(function(it){return !query||(it.label+' '+it.detail+' '+(it.terms||'')).toLowerCase().includes(query)}).slice(0,12);
      if(!matches.length){var empty=document.createElement('p');empty.className='air-command-empty';empty.textContent='No matches. Try “unit”, “MCQ”, “timer” or “notes”.';results.appendChild(empty);return}
      matches.forEach(function(it,index){
        var a=document.createElement('a');a.className='air-command-result';a.href=it.href;
        a.setAttribute('role','option');a.innerHTML='<span class="air-command-result-icon">'+(it.href==='index.html'?'⌂':it.href==='units.html'?'▤':it.href==='practice.html'?'✓':it.href==='tools.html'?'✦':'↳')+'</span><span class="air-command-result-copy"><strong></strong><small></small></span><span class="air-command-result-arrow">↗</span>';
        a.querySelector('strong').textContent=it.label;a.querySelector('small').textContent=it.detail;
        a.addEventListener('click',function(e){
          if(it.href.charAt(0)==='#'){e.preventDefault();var target=document.getElementById(it.href.slice(1));if(target){target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});history.replaceState(null,'',it.href)}}
          palette.hidden=true;
        });
        results.appendChild(a);
      });
    }
    function openPalette(){palette.hidden=false;render(input.value);setTimeout(function(){input.focus()},30)}
    function closePalette(){palette.hidden=true}
    input.addEventListener('input',function(){render(input.value)});
    close.addEventListener('click',closePalette);
    palette.addEventListener('click',function(e){if(e.target===palette)closePalette()});
    document.addEventListener('keydown',function(e){
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();palette.hidden?openPalette():closePalette()}
      if(e.key==='Escape'&&!palette.hidden){closePalette()}
    });
    render('');
  }

  // Add a compact floating top button on long pages when one is not already present.
  if(!document.getElementById('airBackToTop')){
    var topButton=document.createElement('button');topButton.id='airBackToTop';topButton.type='button';topButton.className='air-back-to-top';topButton.innerHTML='↑ <span>Top</span>';topButton.setAttribute('aria-label','Back to top');topButton.hidden=true;
    document.body.appendChild(topButton);
    topButton.addEventListener('click',function(){window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});
    var tick=false;
    window.addEventListener('scroll',function(){if(!tick){window.requestAnimationFrame(function(){topButton.hidden=window.scrollY<480;tick=false}) ;tick=true}},{passive:true});
  }


  // Personal study data: persist checklist state and offer a portable backup/restore.
  try{
    var storagePrefix='air-';
    var checklistKey='air-study-checklist-v1';
    var checklistState={};
    try{checklistState=JSON.parse(localStorage.getItem(checklistKey)||'{}')||{}}catch(e){checklistState={}}
    document.querySelectorAll('.study-checklist input[type="checkbox"]').forEach(function(box,index){
      var key=box.id||box.name||('task-'+index);
      if(Object.prototype.hasOwnProperty.call(checklistState,key))box.checked=!!checklistState[key];
      box.addEventListener('change',function(){
        checklistState[key]=box.checked;
        try{localStorage.setItem(checklistKey,JSON.stringify(checklistState))}catch(e){}
        updateChecklistProgress();
      });
    });
    function updateChecklistProgress(){
      var boxes=Array.from(document.querySelectorAll('.study-checklist input[type="checkbox"]'));
      var done=boxes.filter(function(b){return b.checked}).length;
      var node=document.getElementById('airChecklistProgress');
      if(node)node.textContent=boxes.length?done+' of '+boxes.length+' tasks complete':'Your checklist is ready';
    }
    updateChecklistProgress();

    function collectAirData(){
      var data={format:'IHRM-AIR-backup',version:1,exportedAt:new Date().toISOString(),items:{}};
      for(var i=0;i<localStorage.length;i++){
        var key=localStorage.key(i);
        if(key&&key.indexOf(storagePrefix)===0){
          try{data.items[key]=JSON.parse(localStorage.getItem(key))}catch(e){data.items[key]=localStorage.getItem(key)}
        }
      }
      return data;
    }
    function downloadAirBackup(){
      var blob=new Blob([JSON.stringify(collectAirData(),null,2)],{type:'application/json'});
      var url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='ihrm-air-study-backup-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);
    }
    function injectDataTools(){
      if(path!=='backup.html'||!document.querySelector('main')||document.getElementById('airDataBackupPanel'))return;
      var panel=document.createElement('section');panel.id='airDataBackupPanel';panel.className='air-data-panel';
      panel.innerHTML='<div class="air-data-panel-copy"><span class="air-data-kicker">YOUR LEARNING DATA</span><h2>Progress & backup</h2><p>Keep your study checklist and saved IHRM Air progress portable. Export a backup before changing devices.</p><p id="airChecklistProgress" class="air-data-status" aria-live="polite">Your checklist is ready</p></div><div class="air-data-actions"><button type="button" class="air-data-button" id="airExportData">↓ Export backup</button><label class="air-data-button air-import-button" for="airImportFile">↑ Restore backup<input type="file" id="airImportFile" accept="application/json,.json" hidden></label></div><p class="air-data-message" id="airDataMessage" role="status"></p>';
      var main=document.querySelector('main');main.appendChild(panel);
      panel.querySelector('#airExportData').addEventListener('click',downloadAirBackup);
      panel.querySelector('#airImportFile').addEventListener('change',function(e){
        var file=e.target.files&&e.target.files[0];if(!file)return;
        var reader=new FileReader();
        reader.onload=function(){
          try{
            var data=JSON.parse(String(reader.result||''));
            if(!data||data.format!=='IHRM-AIR-backup'||!data.items||typeof data.items!=='object')throw new Error('This file is not a valid IHRM Air backup.');
            Object.keys(data.items).forEach(function(key){
              if(key.indexOf(storagePrefix)!==0)return;
              var value=data.items[key];
              localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
            });
            panel.querySelector('#airDataMessage').textContent='Backup restored. Reload the page to refresh all saved progress.';
          }catch(err){panel.querySelector('#airDataMessage').textContent=err.message||'Could not restore this backup.'}
        };
        reader.readAsText(file);e.target.value='';
      });
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectDataTools);else injectDataTools();
  }catch(e){/* Storage may be disabled; the rest of the platform remains usable. */}



  // Study Session Tracker (non-AI; local-device storage).
  (function(){
    if(path!=='tracker.html'||!document.querySelector('main')||document.getElementById('air-study-session-tracker'))return;
    var key='air-study-session-tracker-v1',dailyKey='air-study-session-daily-goal-v1';
    function read(){try{var d=JSON.parse(localStorage.getItem(key)||'{}');return d&&typeof d==='object'?d:{}}catch(e){return {}}}
    function save(d){try{localStorage.setItem(key,JSON.stringify(d));return true}catch(e){return false}}
    function dayKey(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}
    function todayMinutes(d){return (d.sessions||[]).filter(function(s){return s.day===dayKey(new Date())}).reduce(function(n,s){return n+(Number(s.minutes)||0)},0)}
    var d=read();if(!Array.isArray(d.sessions))d.sessions=[];
    var main=document.querySelector('main'),section=document.createElement('section');section.id='air-study-session-tracker';section.className='air-session-tracker';
    section.innerHTML='<div class="air-session-head"><div><span class="air-intel-kicker">FOCUS & CONSISTENCY</span><h2>Study Session Tracker</h2><p>Track focused study time, daily targets, and weekly consistency. Data is saved in this browser.</p></div><span class="air-session-live" id="airSessionState" aria-live="polite">Ready when you are</span></div><div class="air-session-metrics"><article><span>Today</span><strong id="airSessionToday">0 min</strong><small id="airSessionGoalText">Goal: 60 min</small></article><article><span>This week</span><strong id="airSessionWeek">0 min</strong><small>Monday to today</small></article><article><span>Sessions logged</span><strong id="airSessionCount">0</strong><small>All-time total</small></article><article><span>Current streak</span><strong id="airSessionStreak">0 days</strong><small>Days with logged study</small></article></div><div class="air-session-controls"><label>Daily target<select id="airSessionGoal"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option><option value="180">180 minutes</option></select></label><label>Session length<select id="airSessionLength"><option value="15">15 minutes</option><option value="25" selected>25 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label><label class="air-session-focus">Study focus<input id="airSessionFocus" maxlength="100" placeholder="e.g. Unit III — compensation"></label></div><div class="air-session-progress" aria-label="Daily study goal progress"><span id="airSessionProgressBar"></span></div><div class="air-session-actions"><button type="button" id="airSessionStart">Start focus timer</button><button type="button" id="airSessionLog">Log completed session</button><button type="button" id="airSessionStop" disabled>Stop timer</button></div><p class="air-session-note" id="airSessionMessage" aria-live="polite">Use the timer for a focused block, or log study time you have already completed.</p><div class="air-session-history-head"><h3>Recent sessions</h3><button type="button" id="airSessionExport">Export history</button></div><div id="airSessionHistory" class="air-session-history"></div>';
    var first=main.querySelector('h1');if(first&&first.parentNode)first.parentNode.insertBefore(section,first.nextSibling);else main.insertBefore(section,main.firstChild);
    var goal=60;try{goal=Number(localStorage.getItem(dailyKey))||60}catch(e){}var goalEl=section.querySelector('#airSessionGoal');goalEl.value=String(goal);
    var timer=null,startedAt=0,planned=25;
    function fmt(n){n=Math.max(0,Math.round(n));return n+' min'}
    function render(){
      d=read();if(!Array.isArray(d.sessions))d.sessions=[];var today=todayMinutes(d),now=new Date(),monday=new Date(now);monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);var week=d.sessions.filter(function(s){return s.day>=dayKey(monday)&&s.day<=dayKey(now)}).reduce(function(n,s){return n+(Number(s.minutes)||0)},0);
      var days=Array.from(new Set(d.sessions.map(function(s){return s.day}))).sort(),streak=0,check=new Date();check.setHours(0,0,0,0);var todayStr=dayKey(check);if(days.indexOf(todayStr)<0)check.setDate(check.getDate()-1);while(days.indexOf(dayKey(check))>=0&&streak<366){streak++;check.setDate(check.getDate()-1)}
      section.querySelector('#airSessionToday').textContent=fmt(today);section.querySelector('#airSessionGoalText').textContent='Goal: '+goal+' min';section.querySelector('#airSessionWeek').textContent=fmt(week);section.querySelector('#airSessionCount').textContent=d.sessions.length;section.querySelector('#airSessionStreak').textContent=streak+' '+(streak===1?'day':'days');section.querySelector('#airSessionProgressBar').style.width=Math.min(100,Math.round(today/goal*100))+'%';
      var hist=section.querySelector('#airSessionHistory');hist.innerHTML='';var recent=d.sessions.slice(-5).reverse();if(!recent.length){hist.innerHTML='<p>No sessions logged yet. Your first completed study block will appear here.</p>'}else recent.forEach(function(s){var row=document.createElement('article');row.className='air-session-history-row';var title=document.createElement('strong');title.textContent=s.focus||'Study session';var meta=document.createElement('span');meta.textContent=s.minutes+' min · '+s.day;row.appendChild(title);row.appendChild(meta);hist.appendChild(row)});
    }
    function log(minutes,focus){if(!minutes||minutes<1)return;d=read();if(!Array.isArray(d.sessions))d.sessions=[];d.sessions.push({day:dayKey(new Date()),minutes:Math.round(minutes),focus:String(focus||'').trim().slice(0,100),loggedAt:new Date().toISOString()});d.sessions=d.sessions.slice(-500);if(!save(d)){section.querySelector('#airSessionMessage').textContent='Could not save progress. Check browser storage settings.';return}render();section.querySelector('#airSessionMessage').textContent='Session logged — well done. Keep your study streak going.';try{window.dispatchEvent(new CustomEvent('air-study-data-updated',{detail:{type:'session'}}))}catch(e){}}
    goalEl.addEventListener('change',function(){goal=Number(goalEl.value)||60;try{localStorage.setItem(dailyKey,String(goal))}catch(e){}render()});
    section.querySelector('#airSessionStart').addEventListener('click',function(){if(timer)return;planned=Number(section.querySelector('#airSessionLength').value)||25;startedAt=Date.now();section.querySelector('#airSessionState').textContent='Focus session running';section.querySelector('#airSessionStart').disabled=true;section.querySelector('#airSessionStop').disabled=false;section.querySelector('#airSessionMessage').textContent='Focus on: '+(section.querySelector('#airSessionFocus').value.trim()||'your current study task')+'. Target: '+planned+' minutes.';timer=setTimeout(function(){if(!timer)return;timer=null;log(planned,section.querySelector('#airSessionFocus').value);section.querySelector('#airSessionState').textContent='Session complete';section.querySelector('#airSessionStart').disabled=false;section.querySelector('#airSessionStop').disabled=true},planned*60000)});
    section.querySelector('#airSessionStop').addEventListener('click',function(){if(!timer)return;clearTimeout(timer);timer=null;var elapsed=Math.floor((Date.now()-startedAt)/60000);section.querySelector('#airSessionState').textContent='Timer stopped';section.querySelector('#airSessionStart').disabled=false;section.querySelector('#airSessionStop').disabled=true;if(elapsed>0)log(elapsed,section.querySelector('#airSessionFocus').value);else section.querySelector('#airSessionMessage').textContent='Timer stopped before one full minute; no session was logged.'});
    section.querySelector('#airSessionLog').addEventListener('click',function(){var mins=Number(section.querySelector('#airSessionLength').value)||25;var val=window.prompt('How many minutes did you study?',String(mins));if(val===null)return;var n=Number(val);if(!Number.isFinite(n)||n<1||n>600){section.querySelector('#airSessionMessage').textContent='Enter a duration from 1 to 600 minutes.';return}log(n,section.querySelector('#airSessionFocus').value)});
    section.querySelector('#airSessionExport').addEventListener('click',function(){var blob=new Blob([JSON.stringify({format:'IHRM-AIR-study-sessions',exportedAt:new Date().toISOString(),sessions:read().sessions||[]},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ihrm-air-study-sessions.json';a.click();setTimeout(function(){URL.revokeObjectURL(url)},1000)});
    render();
  })();

  // Study Intelligence (non-AI): progress dashboard, mock history, and editable weekly plan.
  (function(){
    if(path!=='planner.html'||!document.querySelector('main')||document.getElementById('air-study-intelligence'))return;
    var store={
      get:function(k,fallback){try{var v=localStorage.getItem(k);return v===null?fallback:JSON.parse(v)}catch(e){return fallback}},
      set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
    };
    var units=[
      {id:1,title:'IHRM foundations',href:'units.html#u1',tasks:['Review the unit notes','Write a 5-point summary','Complete unit practice']},
      {id:2,title:'Staffing & performance',href:'units.html#u2',tasks:['Review staffing approaches','Compare performance systems','Complete unit practice']},
      {id:3,title:'International compensation',href:'units.html#u3',tasks:['Review compensation concepts','Practise a short answer','Complete unit practice']},
      {id:4,title:'Unions, law & trends',href:'units.html#u4',tasks:['Review laws and unions','Revise emerging trends','Complete unit practice']}
    ];
    var stamps=units.map(function(u){return store.get('air-s'+u.id,null)==='1'||localStorage.getItem('air-s'+u.id)==='1'});
    var stats=store.get('air-exam-stats',{attempts:0,correct:0,best:0})||{};
    var history=store.get('air-exam-history',[]);
    if(!Array.isArray(history))history=[];
    var planner=store.get('air-study-plan-v1',{});
    if(!planner||typeof planner!=='object')planner={};
    var total=stamps.filter(Boolean).length,accuracy=Number(stats.attempts)>0?Math.round(Number(stats.correct||0)/Number(stats.attempts)*100):null;
    var panel=document.createElement('section');panel.id='air-study-intelligence';panel.className='air-intelligence-panel';
    panel.innerHTML='<div class="air-intel-head"><div><span class="air-intel-kicker">YOUR STUDY FLIGHT DECK</span><h2>Study progress & planner</h2><p>Track unit completion, review practice results, and plan your next study sessions. Your data stays in this browser.</p></div><a class="air-intel-link" href="practice.html">Practise now ↗</a></div><div class="air-intel-metrics"><article class="air-intel-metric"><span>Units stamped</span><strong id="airMetricUnits">'+total+'/4</strong><small>Use the unit stamps to mark progress</small></article><article class="air-intel-metric"><span>Questions answered</span><strong id="airMetricAttempts">'+(Number(stats.attempts)||0)+'</strong><small>Across saved practice sessions</small></article><article class="air-intel-metric"><span>Practice accuracy</span><strong id="airMetricAccuracy">'+(accuracy===null?'—':accuracy+'%')+'</strong><small>Based on saved question stats</small></article><article class="air-intel-metric"><span>Best mock score</span><strong id="airMetricBest">'+(Number(stats.best)>0?Math.round(Number(stats.best))+'%':'—')+'</strong><small>Your highest saved result</small></article></div><section class="air-intel-subpanel air-revision-builder"><h3>Personal revision schedule</h3><p class="air-intel-help">Build a focused plan from your weak units and your exam date. This timetable is a guide, not a prediction of results.</p><div class="air-revision-controls"><label for="airExamDate">Exam date <input type="date" id="airExamDate"></label><label for="airRevisionMinutes">Daily study time <select id="airRevisionMinutes"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">2 hours</option></select></label><button type="button" id="airBuildRevision">Build my schedule</button></div><div id="airRevisionSchedule" aria-live="polite"></div></section><div class="air-intel-daily"><article class="air-intel-subpanel"><h3>Daily study goal</h3><p class="air-intel-help">Answer questions to reach your daily target.</p><div class="air-daily-controls"><label for="airDailyGoal">Daily target</label><input id="airDailyGoal" type="number" min="1" max="200" step="1"><span>questions</span></div><div class="air-daily-track"><span id="airDailyFill"></span></div><p class="air-intel-help" id="airDailySummary" role="status"></p></article><article class="air-intel-subpanel"><h3>Consistency & readiness</h3><div class="air-readiness-metrics"><div><span>Study streak</span><strong id="airStudyStreak">0 days</strong></div><div><span>Readiness estimate</span><strong id="airReadiness">Getting started</strong></div></div><p class="air-intel-help" id="airReadinessNote">Complete units and practise questions to build your estimate.</p></article></div><div class="air-intel-columns"><section class="air-intel-subpanel"><h3>Unit-by-unit progress</h3><div id="airUnitProgress"></div></section><section class="air-intel-subpanel"><h3>Weekly study planner</h3><p class="air-intel-help">Choose a focus and mark sessions done. Changes save automatically.</p><div id="airPlanner"></div><button type="button" class="air-intel-reset" id="airResetPlanner">Reset weekly plan</button></section></div><section class="air-intel-subpanel"><h3>Weak topics & revision priorities</h3><p class="air-intel-help">Priorities are estimated from your recorded answers by unit. Units without practice data are marked for a first attempt.</p><div id="airWeakTopics"></div></section><section class="air-intel-subpanel air-history"><div class="air-history-head"><h3>Mock-exam history</h3><a href="practice.html">Open exam centre →</a></div><div id="airExamHistory"></div></section><p class="air-intel-note" role="status" id="airIntelStatus">Progress is stored locally on this device and browser.</p>';
    var main=document.querySelector('main');main.appendChild(panel);
    var progressRoot=panel.querySelector('#airUnitProgress');
    var historyRoot=panel.querySelector('#airExamHistory');
    function localDay(date){var d=date||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
    function readDaily(){var d=store.get('air-daily-study-v1',{});if(!d||typeof d!=='object')d={};if(d.date!==localDay()){d={date:localDay(),count:0,goal:Number(d.goal)||10};store.set('air-daily-study-v1',d)}d.goal=Math.max(1,Math.min(200,Number(d.goal)||10));d.count=Math.max(0,Number(d.count)||0);return d}
    function readActivity(){var a=store.get('air-study-activity-v1',[]);return Array.isArray(a)?a:[]}
    function streakDays(){var a=readActivity(),set={};a.forEach(function(d){set[d]=true});var cursor=new Date();if(!set[localDay(cursor)])cursor.setDate(cursor.getDate()-1);var n=0;for(var i=0;i<366;i++){if(!set[localDay(cursor)])break;n++;cursor.setDate(cursor.getDate()-1)}return n}
    var daily=readDaily(),lastAttempts=Number(stats.attempts)||0;
    function refreshDashboard(){
      stamps=units.map(function(u){return localStorage.getItem('air-s'+u.id)==='1'});
      stats=store.get('air-exam-stats',{attempts:0,correct:0,best:0})||{};
      history=store.get('air-exam-history',[]);if(!Array.isArray(history))history=[];
      var done=stamps.filter(Boolean).length;
      var attempts=Math.max(0,Number(stats.attempts)||0),correct=Math.max(0,Number(stats.correct)||0);
      panel.querySelector('#airMetricUnits').textContent=done+'/4';
      panel.querySelector('#airMetricAttempts').textContent=attempts;
      panel.querySelector('#airMetricAccuracy').textContent=attempts?Math.round(correct/attempts*100)+'%':'—';
      panel.querySelector('#airMetricBest').textContent=Number(stats.best)>0?Math.round(Number(stats.best))+'%':'—';
      daily=readDaily();
      var goalInput=panel.querySelector('#airDailyGoal');if(document.activeElement!==goalInput)goalInput.value=daily.goal;
      panel.querySelector('#airDailyFill').style.width=Math.min(100,Math.round(daily.count/daily.goal*100))+'%';
      panel.querySelector('#airDailySummary').textContent=daily.count+' of '+daily.goal+' questions answered today'+(daily.count>=daily.goal?' — daily goal reached!':' · '+(daily.goal-daily.count)+' to go');
      var streak=streakDays();panel.querySelector('#airStudyStreak').textContent=streak+' '+(streak===1?'day':'days');
      var readiness=Math.round((done/4*40)+(Math.min(100,Number(stats.attempts)||0)/100*20)+(Math.min(100,Number(stats.correct||0)/Math.max(1,Number(stats.attempts)||1)*100)*0.2)+(Math.max(0,Number(stats.best)||0)*0.2));
      panel.querySelector('#airReadiness').textContent=(Number(stats.attempts)||0)===0&&done===0?'Getting started':readiness>=80?'Strong':readiness>=55?'Building':'In progress';
      panel.querySelector('#airReadinessNote').textContent='Study indicator: '+Math.min(100,readiness)+'% · Based on unit stamps, practice volume, accuracy and best mock score. This is a study guide, not a prediction of exam results.';

      progressRoot.textContent='';
      units.forEach(function(u){
        var row=document.createElement('div');row.className='air-unit-progress-row';
        var label=document.createElement('div');label.className='air-unit-progress-label';
        var link=document.createElement('a');link.href=u.href;link.textContent='Unit '+u.id+' · '+u.title;
        var status=document.createElement('span');status.className='air-unit-status';status.textContent=stamps[u.id-1]?'Complete':'In progress';
        label.appendChild(link);label.appendChild(status);
        var track=document.createElement('div');track.className='air-unit-track';var fill=document.createElement('span');fill.style.width=stamps[u.id-1]?'100%':'8%';track.appendChild(fill);
        row.appendChild(label);row.appendChild(track);progressRoot.appendChild(row);
      });
      var weakRoot=panel.querySelector('#airWeakTopics');weakRoot.textContent='';
      var topicStats=store.get('air-unit-practice-v1',{});if(!topicStats||typeof topicStats!=='object')topicStats={};
      var ranked=units.map(function(u){var v=topicStats[u.id]||{attempts:0,correct:0};var a=Math.max(0,Number(v.attempts)||0),c=Math.max(0,Number(v.correct)||0);return {unit:u,attempts:a,accuracy:a?Math.round(c/a*100):null}}).sort(function(a,b){if(a.accuracy===null&&b.accuracy!==null)return -1;if(b.accuracy===null&&a.accuracy!==null)return 1;return (a.accuracy===null?0:a.accuracy)-(b.accuracy===null?0:b.accuracy)});
      ranked.forEach(function(v){var row=document.createElement('div');row.className='air-weak-row';var copy=document.createElement('div');copy.className='air-weak-copy';var title=document.createElement('strong');title.textContent='Unit '+v.unit.id+' · '+v.unit.title;var detail=document.createElement('span');detail.textContent=v.attempts?v.accuracy+'% accuracy · '+v.attempts+' answers':'No answers recorded yet';copy.appendChild(title);copy.appendChild(detail);var actions=document.createElement('div');actions.className='air-weak-actions';var link=document.createElement('a');link.href='units.html#u'+v.unit.id;link.textContent=v.attempts?(v.accuracy<70?'Revise unit':'Review unit'):'Open unit';var practiceLink=document.createElement('a');practiceLink.href='practice.html?unit='+v.unit.id+'#exam-centre';practiceLink.textContent='Practise unit →';practiceLink.className='air-weak-practice';actions.appendChild(link);actions.appendChild(practiceLink);row.appendChild(copy);row.appendChild(actions);weakRoot.appendChild(row)});
      historyRoot.textContent='';
      if(history.length){
        history.slice(0,5).forEach(function(item){
          var row=document.createElement('div');row.className='air-history-row';
          var name=document.createElement('strong');name.textContent=item.mode==='mock'?'Timed mock exam':'Unit practice';
          var detail=document.createElement('span');detail.textContent=(item.date||'Saved session')+' · '+(item.score!=null?item.score+'%':'Score unavailable')+' · '+(item.correct||0)+'/'+(item.total||0)+' correct';
          row.appendChild(name);row.appendChild(detail);historyRoot.appendChild(row);
        });
      }else{
        var empty=document.createElement('p');empty.className='air-intel-help';empty.textContent='Your completed mock exams will appear here after you finish a session.';historyRoot.appendChild(empty);
      }
    }
    refreshDashboard();
    window.addEventListener('air-study-data-updated',refreshDashboard);
    window.addEventListener('storage',function(e){if(!e.key||/^air-(s[1-4]|exam-stats|exam-history|unit-practice-v1)$/.test(e.key))refreshDashboard()});
    var revisionSettings=store.get('air-revision-settings-v1',{});
    var examDateInput=panel.querySelector('#airExamDate'),minutesInput=panel.querySelector('#airRevisionMinutes'),scheduleRoot=panel.querySelector('#airRevisionSchedule');
    examDateInput.value=revisionSettings.date||'';minutesInput.value=String(revisionSettings.minutes||45);
    function buildRevision(){
      var dateValue=examDateInput.value,minutes=Math.max(30,Number(minutesInput.value)||45);
      revisionSettings={date:dateValue,minutes:minutes};store.set('air-revision-settings-v1',revisionSettings);scheduleRoot.textContent='';
      var today=new Date();today.setHours(0,0,0,0);var daysLeft=null;
      if(dateValue){var target=new Date(dateValue+'T00:00:00');daysLeft=Math.ceil((target-today)/86400000)}
      var heading=document.createElement('p');heading.className='air-intel-help';
      if(daysLeft!==null){heading.textContent=daysLeft<0?'The selected exam date has passed. Choose a future date to create a countdown.':daysLeft===0?'Your exam is today. Focus on concise revision and rest.':daysLeft+' day'+(daysLeft===1?'':'s')+' until your exam.'}
      else heading.textContent='No exam date selected. Your plan will use a seven-day cycle.';
      scheduleRoot.appendChild(heading);
      var unitData=store.get('air-unit-practice-v1',{})||{};
      var priority=units.map(function(u){var v=unitData[u.id]||{attempts:0,correct:0};var a=Number(v.attempts)||0,c=Number(v.correct)||0;return {unit:u,attempts:a,accuracy:a?Math.round(c/a*100):null,done:stamps[u.id-1]}}).sort(function(a,b){if(a.accuracy===null&&b.accuracy!==null)return -1;if(b.accuracy===null&&a.accuracy!==null)return 1;return (a.accuracy===null?0:a.accuracy)-(b.accuracy===null?0:b.accuracy)});
      var count=daysLeft===null?7:Math.max(1,Math.min(14,daysLeft||1));
      for(var i=0;i<Math.min(count,14);i++){
        var date=new Date(today);date.setDate(today.getDate()+i);var row=document.createElement('div');row.className='air-revision-day';
        var day=document.createElement('strong');day.textContent=date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
        var focus=document.createElement('span');
        if(i%4===3)focus.textContent='Mixed practice + review incorrect answers';
        else {var item=priority[i%priority.length];focus.textContent=item.unit.title+' · '+(item.accuracy===null?'first practice':item.accuracy<70?'priority revision':item.accuracy<85?'targeted practice':'quick review');}
        var time=document.createElement('small');time.textContent=minutes+' minutes';
        row.appendChild(day);row.appendChild(focus);row.appendChild(time);scheduleRoot.appendChild(row);
      }
      if(daysLeft!==null&&daysLeft>14){var note=document.createElement('p');note.className='air-intel-help';note.textContent='Showing the next 14 days. Rebuild the schedule as your exam approaches.';scheduleRoot.appendChild(note)}
      panel.querySelector('#airIntelStatus').textContent='Revision schedule saved on this device.';
    }
    panel.querySelector('#airBuildRevision').addEventListener('click',buildRevision);
    if(revisionSettings.date||revisionSettings.minutes)buildRevision();
        panel.querySelector('#airDailyGoal').addEventListener('change',function(){daily=readDaily();daily.goal=Math.max(1,Math.min(200,Math.round(Number(this.value)||10)));store.set('air-daily-study-v1',daily);refreshDashboard();panel.querySelector('#airIntelStatus').textContent='Daily target saved on this device.'});
    window.addEventListener('air-study-data-updated',function(e){
      if(e.detail&&e.detail.type==='question'){
        daily=readDaily();daily.count+=1;store.set('air-daily-study-v1',daily);
        var activity=readActivity(),today=localDay();if(activity.indexOf(today)<0)activity.push(today);store.set('air-study-activity-v1',activity.slice(-366));
      }
      refreshDashboard();
    });
    var plannerRoot=panel.querySelector('#airPlanner');
    var days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    var defaults=['Unit I · Foundations','Unit II · Staffing','Unit III · Compensation','Unit IV · Law & trends','Practice questions','Timed mock exam','Review weak topics'];
    days.forEach(function(day,i){
      var row=document.createElement('label');row.className='air-plan-row';
      var check=document.createElement('input');check.type='checkbox';check.checked=!!planner[day+'_done'];check.setAttribute('aria-label',day+' session complete');
      var copy=document.createElement('span');copy.className='air-plan-copy';
      var dayName=document.createElement('strong');dayName.textContent=day;
      var input=document.createElement('input');input.type='text';input.maxLength=90;input.value=typeof planner[day+'_focus']==='string'?planner[day+'_focus']:defaults[i];input.setAttribute('aria-label',day+' study focus');
      copy.appendChild(dayName);copy.appendChild(input);row.appendChild(check);row.appendChild(copy);plannerRoot.appendChild(row);
      function save(){planner[day+'_done']=check.checked;planner[day+'_focus']=input.value;store.set('air-study-plan-v1',planner);panel.querySelector('#airIntelStatus').textContent='Weekly plan saved on this device.';row.classList.toggle('is-done',check.checked)}
      check.addEventListener('change',save);input.addEventListener('change',save);row.classList.toggle('is-done',check.checked);
    });
    panel.querySelector('#airResetPlanner').addEventListener('click',function(){
      if(!window.confirm('Reset your weekly planner to its suggested study topics?'))return;
      localStorage.removeItem('air-study-plan-v1');location.reload();
    });
    panel.querySelector('.air-intel-head .air-intel-link').addEventListener('click',function(){});
  })();


  // Keep learners informed when connectivity changes; study progress remains device-local.
  (function(){
    if(!wrap || document.getElementById('airConnectionStatus')) return;
    var status=document.createElement('span');
    status.id='airConnectionStatus';
    status.className='air-connection-status';
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    function paint(){
      var online=navigator.onLine!==false;
      status.textContent=online?'● Online · saved on this device':'○ Offline · cached pages may be available';
      status.classList.toggle('is-offline',!online);
      status.setAttribute('aria-label',online?'Online. Your study data is saved on this device.':'Offline. Cached pages may be available; study data remains on this device.');
    }
    wrap.appendChild(status);
    paint();
    window.addEventListener('online',paint);
    window.addEventListener('offline',paint);
  })();

  // Progressive Web App foundation: install metadata and offline app shell.
  (function(){
    var manifestLink=document.querySelector('link[rel="manifest"]');
    if(!manifestLink){manifestLink=document.createElement('link');manifestLink.rel='manifest';manifestLink.href='manifest.webmanifest';document.head.appendChild(manifestLink);}
    var themeMeta=document.querySelector('meta[name="theme-color"]');
    if(!themeMeta){themeMeta=document.createElement('meta');themeMeta.name='theme-color';themeMeta.content='#2f6fd0';document.head.appendChild(themeMeta);}
    if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')){
      function registerOfflineSupport(){
        navigator.serviceWorker.register(new URL('service-worker.js',document.baseURI),{scope:new URL('./',document.baseURI).pathname})
          .catch(function(error){console.warn('IHRM Air offline support could not be registered.',error);});
      }
      if(document.readyState==='complete')registerOfflineSupport();
      else window.addEventListener('load',registerOfflineSupport,{once:true});
    }
  })();

  // Installable app affordance: only show it when the browser confirms installation is available.
  (function(){
    var installPrompt=null;
    var navWrap=document.querySelector('.site-nav-wrap');
    if(!navWrap||document.getElementById('airInstallApp'))return;
    var installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
    if(installed)return;
    var button=document.createElement('button');
    button.id='airInstallApp';button.type='button';button.className='site-theme-toggle air-install-app';
    button.textContent='＋ Install app';button.hidden=true;
    button.setAttribute('aria-label','Install IHRM Air as an app');
    button.addEventListener('click',async function(){
      if(!installPrompt)return;
      button.disabled=true;
      try{
        installPrompt.prompt();
        var choice=await installPrompt.userChoice;
        if(choice&&choice.outcome==='accepted')button.hidden=true;
      }catch(error){console.warn('IHRM Air install prompt was not completed.',error)}
      installPrompt=null;button.disabled=false;
    });
    navWrap.appendChild(button);
    window.addEventListener('beforeinstallprompt',function(event){
      event.preventDefault();installPrompt=event;button.hidden=false;
    });
    window.addEventListener('appinstalled',function(){button.hidden=true;installPrompt=null;});
  })();


  // Premium navigation layer: command palette, reading progress, and back-to-top.
  (function(){
    if(!document.body || document.getElementById('airCommandOverlay')) return;
    var pages=[
      ['Home','index.html','Dashboard and study overview'],
      ['Course units','units.html','Browse the four IHRM units'],
      ['Practice & mock exams','practice.html','Questions, practice and timed exams'],
      ['Study tools','tools.html','Flashcards and learning tools'],
      ['Study planner','planner.html','Build a revision plan'],
      ['Study tracker','tracker.html','Focus timer and session history'],
      ['Backup & restore','backup.html','Export or restore device data'],
      ['Evidence & references','references.html','Sources and further reading'],
      ['Agent Crew','agents.html','Run a guided study mission']
    ];
    var progress=document.createElement('div');
    progress.id='siteReadingProgress';progress.setAttribute('aria-hidden','true');
    var progressFill=document.createElement('span');progress.appendChild(progressFill);document.body.appendChild(progress);
    var top=document.createElement('button');
    top.id='siteBackTop';top.type='button';top.textContent='↑';top.setAttribute('aria-label','Back to top');
    top.addEventListener('click',function(){window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
    document.body.appendChild(top);
    function updateScroll(){
      var max=document.documentElement.scrollHeight-window.innerHeight;
      progressFill.style.width=(max>0?Math.max(0,Math.min(100,window.scrollY/max*100)):0)+'%';
      top.classList.toggle('is-visible',window.scrollY>420);
    }
    window.addEventListener('scroll',updateScroll,{passive:true});window.addEventListener('resize',updateScroll);updateScroll();

    var overlay=document.createElement('div');
    overlay.id='airCommandOverlay';overlay.className='air-command-overlay';overlay.hidden=true;
    overlay.innerHTML='<section class="air-command-box" role="dialog" aria-modal="true" aria-labelledby="airCommandTitle"><div class="air-command-head"><div><p class="air-command-kicker">IHRM AIR · QUICK NAVIGATION</p><h2 id="airCommandTitle">Where would you like to go?</h2></div><button type="button" class="air-command-close" aria-label="Close command palette">×</button></div><label class="air-command-input-wrap"><span aria-hidden="true">⌕</span><input id="airCommandInput" type="search" autocomplete="off" placeholder="Search pages and study tools…"></label><p class="air-command-hint">Press Ctrl/⌘ + K to open · Esc to close · ↑ ↓ to navigate</p><div id="airCommandResults" role="listbox" aria-label="Navigation results"></div></section>';
    document.body.appendChild(overlay);
    var box=overlay.querySelector('.air-command-box'),input=overlay.querySelector('#airCommandInput'),results=overlay.querySelector('#airCommandResults');
    var opener=document.createElement('button');
    opener.type='button';opener.id='airOpenCommand';opener.className='site-theme-toggle';opener.textContent='⌕ Search';opener.setAttribute('aria-haspopup','dialog');opener.setAttribute('aria-controls',overlay.id);
    var nav=document.querySelector('.site-nav-wrap');
    if(nav) nav.appendChild(opener); else {opener.style.position='fixed';opener.style.right='14px';opener.style.top='14px';opener.style.zIndex='100';document.body.appendChild(opener);}
    var activeIndex=0,previousFocus=null;
    function render(){
      var q=input.value.trim().toLowerCase();
      var matches=pages.filter(function(p){return (p[0]+' '+p[1]+' '+p[2]).toLowerCase().indexOf(q)>=0;});
      results.textContent='';activeIndex=0;
      if(!matches.length){var empty=document.createElement('p');empty.textContent='No matching pages. Try “practice”, “planner” or “references”.';results.appendChild(empty);return;}
      matches.forEach(function(p,i){
        var a=document.createElement('a');a.href=p[1];a.setAttribute('role','option');a.setAttribute('aria-selected',i===0?'true':'false');
        var label=document.createElement('span');label.textContent=p[0];
        var detail=document.createElement('small');detail.textContent=p[2];
        a.appendChild(label);a.appendChild(detail);a.addEventListener('mouseenter',function(){activeIndex=i;paintActive();});results.appendChild(a);
      });
    }
    function paintActive(){var items=results.querySelectorAll('a');items.forEach(function(item,i){item.setAttribute('aria-selected',i===activeIndex?'true':'false');});if(items[activeIndex])items[activeIndex].scrollIntoView({block:'nearest'});}
    function openPalette(){previousFocus=document.activeElement;overlay.hidden=false;input.value='';render();input.focus();}
    function closePalette(){overlay.hidden=true;if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();}
    opener.addEventListener('click',openPalette);overlay.querySelector('.air-command-close').addEventListener('click',closePalette);
    overlay.addEventListener('click',function(e){if(e.target===overlay)closePalette();});
    input.addEventListener('input',render);
    input.addEventListener('keydown',function(e){
      var items=results.querySelectorAll('a');
      if(e.key==='ArrowDown'&&items.length){e.preventDefault();activeIndex=(activeIndex+1)%items.length;paintActive();}
      else if(e.key==='ArrowUp'&&items.length){e.preventDefault();activeIndex=(activeIndex-1+items.length)%items.length;paintActive();}
      else if(e.key==='Enter'&&items.length){e.preventDefault();items[activeIndex].click();}
    });
    document.addEventListener('keydown',function(e){
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(overlay.hidden)openPalette();else closePalette();}
      else if(e.key==='Escape'&&!overlay.hidden){e.preventDefault();closePalette();}
      else if(e.key==='Tab'&&!overlay.hidden){
        var focusables=box.querySelectorAll('button,input,a[href]');
        if(e.shiftKey&&document.activeElement===focusables[0]){e.preventDefault();focusables[focusables.length-1].focus();}
        else if(!e.shiftKey&&document.activeElement===focusables[focusables.length-1]){e.preventDefault();focusables[0].focus();}
      }
    });
  })();

})();