/* IHRM Air browser-local specialist workflows. No external AI/API calls. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const status=$('agentStatus'),output=$('agentOutput');
let bank=[],notes=[];
const pages=[{name:'Course units',url:'units.html'},{name:'Full notes',url:'full-notes.html'},{name:'Evidence & Sources',url:'references.html'}];
function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function norm(s){return clean(s).toLowerCase().replace(/[^a-z0-9\s-]/g,' ')}
async function load(){
 if(!status||!output)throw Error('Agent Crew page controls are missing');
 const bankUrl=new URL('data/question-bank.json',document.baseURI).toString();
 const response=await Promise.race([fetch(bankUrl,{cache:'no-store'}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Question bank request timed out')),10000))]);
 if(!response.ok)throw Error('Question bank unavailable (HTTP '+response.status+')');
 const b=await response.json();
 bank=Array.isArray(b.questions)?b.questions:[];
 if(!bank.length)throw Error('Question bank contains no usable questions');
 status.textContent='Ready · '+bank.length+' structured practice questions · loading study sources…';
 Promise.all(pages.map(p=>fetch(p.url).then(r=>r.ok?r.text():'').catch(()=>''))).then(n=>{
  notes=n.map((html,i)=>{const doc=new DOMParser().parseFromString(html,'text/html');return {name:pages[i].name,url:pages[i].url,text:clean(doc.body.textContent),html}}).filter(x=>x.text);
  status.textContent='Ready · '+bank.length+' structured practice questions · '+notes.length+' study sources loaded.';
 }).catch(()=>{status.textContent='Ready · '+bank.length+' structured practice questions · some study sources could not be loaded.'});
}
function relevantNotes(query){
 const terms=norm(query).split(/\s+/).filter(x=>x.length>2);
 return notes.map(note=>{
  const text=note.text.toLowerCase();
  const score=terms.reduce((sum,term)=>sum+(text.split(term).length-1),0);
  let idx=-1;
  for(const term of terms){idx=text.indexOf(term);if(idx>=0)break}
  const excerpt=idx>=0?note.text.slice(Math.max(0,idx-180),Math.min(note.text.length,idx+420)):'';
  return {...note,score,excerpt};
 }).filter(note=>note.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
}
function relevantQuestions(query){
 const terms=norm(query).split(/\s+/).filter(x=>x.length>2);
 return bank.map(q=>{const hay=norm([q.prompt,q.unit,q.topic,...(q.options||[]).map(o=>o.text||o.label||'')].join(' '));const score=terms.reduce((s,t)=>s+(hay.includes(t)?1:0),0);return {...q,_score:score}}).filter(q=>q._score>0).sort((a,b)=>b._score-a._score)
}
function links(items){return items.map(x=>'<a class="source-chip" href="'+esc(x.url)+'">'+esc(x.name)+'</a>').join('')}
function render(title,body,sourceItems=[]){output.innerHTML='<h3>'+esc(title)+'</h3>'+body+(sourceItems.length?'<p><strong>Study sources</strong><br>'+links(sourceItems)+'</p>':'')}
function run(){
 const role=$('agentRole').value,goal=clean($('mission').value),mins=Number($('minutes').value)||25;
 if(!goal){status.textContent='Enter a topic or goal first.';$('mission').focus();return}
 const found=relevantNotes(goal),qs=relevantQuestions(goal),sourceItems=found.map(x=>({name:x.name,url:x.url}));
 if(role==='coach'){
  const blocks=mins>=60?['Recall the topic from memory ('+Math.round(mins*.2)+' min)','Read the most relevant notes ('+Math.round(mins*.35)+' min)','Answer practice questions ('+Math.round(mins*.3)+' min)','Check mistakes and write a 3-line summary ('+Math.round(mins*.15)+' min)']:['Write what you already know ('+Math.max(3,Math.round(mins*.2))+' min)','Study one focused section ('+Math.max(4,Math.round(mins*.4))+' min)','Test yourself and review errors ('+Math.max(3,mins-Math.max(3,Math.round(mins*.2))-Math.max(4,Math.round(mins*.4)))+' min)'];
  render('Your '+mins+'-minute study mission','<p><strong>Goal:</strong> '+esc(goal)+'</p><ol>'+blocks.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p><strong>Success check:</strong> close your notes and explain the key idea in your own words, then answer one question without help.</p>',sourceItems)
 }else if(role==='explainer'||role==='navigator'){
  const title=role==='explainer'?'Explanation scaffold':'Best matching notes';
  if(!found.length){render(title,'<p>No clear text match was found for that wording. Try a shorter topic name, a unit number, or a phrase used in your lecture notes.</p>');return}
  render(title,'<p><strong>Topic:</strong> '+esc(goal)+'</p>'+found.map(x=>'<article class="question"><strong>'+esc(x.name)+'</strong><p>'+esc(x.excerpt||'Relevant content found in this source.')+'…</p><a href="'+esc(x.url)+'">Open source →</a></article>').join('')+(role==='explainer'?'<p><strong>Use this scaffold:</strong> define the concept → explain its purpose → identify two key features → give an IHRM example → evaluate one limitation.</p>':''),sourceItems)
 }else if(role==='exam'){
  if(!qs.length){render('Practice set','<p>No question matched those terms in the current structured bank. Try a unit title or broader topic, or open the full practice page.</p><p><a href="practice.html">Open the complete practice bank →</a></p>');return}
  const chosen=qs.slice(0,Math.min(5,qs.length));
  render('Practice set · '+chosen.length+' questions','<p>Answer from memory first. The source bank is still marked draft pending subject-matter verification.</p>'+chosen.map((q,i)=>'<article class="question"><strong>'+ (i+1)+'. '+esc(q.prompt)+'</strong><div>'+((q.options||[]).map(o=>'<label><input type="radio" name="q'+i+'" value="'+esc(o.id||o.label||o.text||'')+'"> '+esc(o.text||o.label||o.id||'Option')+'</label>').join(''))+'</div><details><summary>Show answer and self-check</summary><p>'+esc((q.options||[]).find(o=>o.id===q.correctOptionId)?.text||q.correctOptionId||'Check the source notes and instructor guidance.')+'</p></details></article>').join('')+'<p><a href="practice.html">Open timed practice and mock exams →</a></p>',sourceItems)
 }else if(role==='flashcards'){
  if(!qs.length){render('Recall cards','<p>No matching cards were found. Try a broader topic or open the complete practice bank.</p><p><a href="practice.html">Browse all practice questions →</a></p>');return}
  render('Active recall deck','<p>Try to answer before opening each card.</p>'+qs.slice(0,8).map((q,i)=>'<details class="question"><summary>Card '+(i+1)+': '+esc(q.prompt)+'</summary><p><strong>Answer options</strong></p><ul>'+((q.options||[]).map(o=>'<li>'+esc(o.text||o.label||o.id||'')+'</li>').join(''))+'</ul><p><strong>Correct option:</strong> '+esc((q.options||[]).find(o=>o.id===q.correctOptionId)?.text||q.correctOptionId||'Verify in source notes.')+'</p></details>').join(''),sourceItems)
 }else if(role==='planner'){
  const steps=[['Retrieval warm-up',Math.max(3,Math.round(mins*.15))],['Focused reading',Math.max(5,Math.round(mins*.35))],['Practice and application',Math.max(5,Math.round(mins*.3))],['Break, then recall check',Math.max(3,mins-Math.max(3,Math.round(mins*.15))-Math.max(5,Math.round(mins*.35))-Math.max(5,Math.round(mins*.3)))]];
  render('Revision sprint','<p><strong>Target:</strong> '+esc(goal)+'</p><ol>'+steps.map(x=>'<li><strong>'+esc(x[0])+'</strong> — '+x[1]+' minutes</li>').join('')+'</ol><p>At the end, record one thing you know, one thing you still confuse, and one question to ask your instructor.</p>',sourceItems)
 }
}
$('runMission').addEventListener('click',run);
$('mission').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')run()});
load().catch(e=>{if(status)status.textContent='Agent Crew unavailable: '+(e&&e.message?e.message:'unknown loading error');console.error('IHRM Air Agent Crew load failed',e)});
})();