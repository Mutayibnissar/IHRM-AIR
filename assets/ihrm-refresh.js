/* IHRM Air — shared navigation and theme helpers */
(function(){
  'use strict';
  var path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  document.querySelectorAll('.site-page-nav a[data-page],.topnav a[data-page]').forEach(function(link){
    if((link.getAttribute('data-page')||'').toLowerCase()===path){link.setAttribute('aria-current','page');}
    else{link.removeAttribute('aria-current');}
  });
  document.querySelectorAll('.site-nav-wrap').forEach(function(wrap){
    var toggle=wrap.querySelector('.site-nav-toggle'),nav=wrap.querySelector('.site-page-nav');
    if(toggle&&nav){
      toggle.addEventListener('click',function(){
        var open=toggle.getAttribute('aria-expanded')==='true';
        toggle.setAttribute('aria-expanded',String(!open));
        nav.classList.toggle('is-open',!open);
      });
      nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){toggle.setAttribute('aria-expanded','false');nav.classList.remove('is-open');});});
    }
  });
  var holder=document.querySelector('.site-nav-wrap')||document.querySelector('.topbar')||document.querySelector('header.top');
  if(holder&&!document.getElementById('airThemeToggle')){
    var btn=document.createElement('button');btn.type='button';btn.id='airThemeToggle';btn.className='air-theme-toggle';btn.setAttribute('aria-label','Switch colour theme');
    var saved='';try{saved=localStorage.getItem('ihrm-air-theme')||'';}catch(e){}
    if(saved==='dark'||saved==='light'){document.documentElement.setAttribute('data-theme',saved);}
    function paint(){var dark=document.documentElement.getAttribute('data-theme')==='dark';btn.textContent=dark?'☀ Light':'☾ Dark';btn.setAttribute('aria-pressed',String(dark));}
    btn.addEventListener('click',function(){
      var next=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
      document.documentElement.setAttribute('data-theme',next);try{localStorage.setItem('ihrm-air-theme',next);}catch(e){}paint();
    });
    var nav=holder.querySelector('.topnav')||holder.querySelector('.site-page-nav');
    if(nav&&nav.parentNode){nav.insertAdjacentElement('afterend',btn);}else{holder.appendChild(btn);}
    paint();
  }
})();