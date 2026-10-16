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

})();