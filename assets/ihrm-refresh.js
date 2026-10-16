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
      {label:'Study Tools',detail:'Focus timer, notes, checklist and recall',href:'tools.html',terms:'tools timer notes checklist recall'}
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
      if(!document.querySelector('main')||document.getElementById('airDataBackupPanel'))return;
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


  // Study Intelligence (non-AI): progress dashboard, mock history, and editable weekly plan.
  (function(){
    if(!document.querySelector('main')||document.getElementById('air-study-intelligence'))return;
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
    panel.innerHTML='<div class="air-intel-head"><div><span class="air-intel-kicker">YOUR STUDY FLIGHT DECK</span><h2>Study progress & planner</h2><p>Track unit completion, review practice results, and plan your next study sessions. Your data stays in this browser.</p></div><a class="air-intel-link" href="practice.html">Practise now ↗</a></div><div class="air-intel-metrics"><article class="air-intel-metric"><span>Units stamped</span><strong id="airMetricUnits">'+total+'/4</strong><small>Use the unit stamps to mark progress</small></article><article class="air-intel-metric"><span>Questions answered</span><strong id="airMetricAttempts">'+(Number(stats.attempts)||0)+'</strong><small>Across saved practice sessions</small></article><article class="air-intel-metric"><span>Practice accuracy</span><strong id="airMetricAccuracy">'+(accuracy===null?'—':accuracy+'%')+'</strong><small>Based on saved question stats</small></article><article class="air-intel-metric"><span>Best mock score</span><strong id="airMetricBest">'+(Number(stats.best)>0?Math.round(Number(stats.best))+'%':'—')+'</strong><small>Your highest saved result</small></article></div><div class="air-intel-columns"><section class="air-intel-subpanel"><h3>Unit-by-unit progress</h3><div id="airUnitProgress"></div></section><section class="air-intel-subpanel"><h3>Weekly study planner</h3><p class="air-intel-help">Choose a focus and mark sessions done. Changes save automatically.</p><div id="airPlanner"></div><button type="button" class="air-intel-reset" id="airResetPlanner">Reset weekly plan</button></section></div><section class="air-intel-subpanel air-history"><div class="air-history-head"><h3>Mock-exam history</h3><a href="practice.html">Open exam centre →</a></div><div id="airExamHistory"></div></section><p class="air-intel-note" role="status" id="airIntelStatus">Progress is stored locally on this device and browser.</p>';
    var main=document.querySelector('main');main.appendChild(panel);
    var progressRoot=panel.querySelector('#airUnitProgress');
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
    window.addEventListener('storage',function(e){if(!e.key||/^air-(s[1-4]|exam-stats|exam-history)$/.test(e.key))refreshDashboard()});
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
    var historyRoot=panel.querySelector('#airExamHistory');
    panel.querySelector('.air-intel-head .air-intel-link').addEventListener('click',function(){});
  })();

})();