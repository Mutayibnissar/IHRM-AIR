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
})();