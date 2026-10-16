/* IHRM Air study utilities — local-first, no external service calls. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const keys={plan:'air-study-plan-v1',sessions:'air-study-sessions-v1',completion:'air-unit-practice-completion-v1'};
const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v}catch(e){return fallback}};
const write=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));return true}catch(e){return false}};
const today=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=(id,msg)=>{if($(id))$(id).textContent=msg};
function initPlanner(){
const form=$('planForm');if(!form)return;
const plan=read(keys.plan,{examDate:'',minutes:60,units:['1','2','3','4'],tasks:[]});
$('examDate').value=plan.examDate||'';$('dailyMinutes').value=plan.minutes||60;
document.querySelectorAll('[name="unit"]').forEach(x=>x.checked=(plan.units||[]).includes(x.value));
function render(){
const p=read(keys.plan,plan),list=$('planTasks');if(!list)return;
const tasks=Array.isArray(p.tasks)?p.tasks:[];
$('planSummary').textContent=tasks.length+' tasks · '+tasks.filter(t=>t.done).length+' completed';
list.innerHTML=tasks.length?tasks.map(t=>'<li class="task-row"><label><input type="checkbox" data-task="'+esc(t.id)+'" '+(t.done?'checked':'')+'> <span><strong>'+esc(t.title)+'</strong><small> '+esc(t.date)+' · '+esc(t.minutes)+' min · Unit '+esc(t.unit)+'</small></span></label><button type="button" class="btn" data-delete="'+esc(t.id)+'" aria-label="Delete '+esc(t.title)+'">Delete</button></li>').join(''):'<li class="local-note">No tasks yet. Generate a plan or add a task below.</li>';
}
form.addEventListener('submit',e=>{e.preventDefault();const units=[...document.querySelectorAll('[name="unit"]:checked')].map(x=>x.value);if(!units.length){notice('planStatus','Choose at least one unit.');return}
const p={examDate:$('examDate').value,minutes:Math.max(15,Number($('dailyMinutes').value)||60),units,tasks:read(keys.plan,{tasks:[]}).tasks||[]};if(!write(keys.plan,p)){notice('planStatus','Could not save. Check browser storage space.');return}
const start=new Date(today()+'T12:00:00'),end=p.examDate?new Date(p.examDate+'T12:00:00'):new Date(start.getTime()+13*86400000),days=Math.max(1,Math.min(120,Math.ceil((end-start)/86400000)+1)),count=Math.min(80,days*units.length),tasks=[];
for(let i=0;i<count;i++){const date=new Date(start.getTime()+Math.floor(i/units.length)*86400000).toISOString().slice(0,10),unit=units[i%units.length];tasks.push({id:'t'+Date.now().toString(36)+i,title:['Review core concepts','Write a short answer','Practise recall questions','Review mistakes'][i%4],unit,date,minutes:Math.max(15,Math.round(p.minutes/Math.min(units.length,3)/5)*5),done:false})}
p.tasks=tasks;if(!write(keys.plan,p)){notice('planStatus','Plan could not be saved.');return}notice('planStatus','Created '+tasks.length+' tasks across '+days+' day(s). Edit by completing or deleting tasks.');render();
});
$('addTask').addEventListener('click',()=>{const p=read(keys.plan,plan);p.tasks=p.tasks||[];p.tasks.push({id:'t'+Date.now().toString(36),title:$('taskTitle').value.trim()||'Review Unit '+$('taskUnit').value,unit:$('taskUnit').value,date:$('taskDate').value||today(),minutes:Math.max(5,Number($('taskMinutes').value)||25),done:false});if(write(keys.plan,p)){ $('taskTitle').value='';notice('planStatus','Task saved.');render()}else notice('planStatus','Could not save task.')});
$('planTasks').addEventListener('change',e=>{const id=e.target.dataset.task;if(!id)return;const p=read(keys.plan,plan);p.tasks=p.tasks.map(t=>t.id===id?{...t,done:e.target.checked}:t);write(keys.plan,p);render()});
$('planTasks').addEventListener('click',e=>{const id=e.target.dataset.delete;if(!id)return;const p=read(keys.plan,plan);p.tasks=p.tasks.filter(t=>t.id!==id);write(keys.plan,p);render()});
$('clearPlan').addEventListener('click',()=>{if(confirm('Delete all planner tasks on this device?')){write(keys.plan,{examDate:$('examDate').value,minutes:Number($('dailyMinutes').value)||60,units:[],tasks:[]});render();notice('planStatus','Planner tasks cleared.')}});
render();
}
function initTracker(){
if(!$('timerDisplay'))return;
let duration=25*60,remaining=duration,interval=null,startedAt=null;
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function show(){ $('timerDisplay').textContent=fmt(remaining);$('timerProgress').style.width=((duration-remaining)/duration*100)+'%';}
function stop(save){if(interval){clearInterval(interval);interval=null}if(save&&startedAt){const elapsed=Math.max(1,Math.round((Date.now()-startedAt)/60000));const logs=read(keys.sessions,[]);logs.unshift({id:'s'+Date.now(),date:today(),startedAt:new Date(startedAt).toISOString(),minutes:Math.min(duration/60,elapsed),unit:$('sessionUnit').value,note:$('sessionNote').value.trim()});write(keys.sessions,logs.slice(0,500));$('sessionNote').value='';renderLogs();notice('timerStatus','Session saved locally. Nice work!')}startedAt=null;$('startTimer').disabled=false;$('pauseTimer').disabled=true;}
function renderLogs(){const logs=read(keys.sessions,[]),week=Date.now()-7*86400000,weekly=logs.filter(x=>new Date(x.startedAt).getTime()>=week),mins=weekly.reduce((n,x)=>n+Number(x.minutes||0),0);$('todayMinutes').textContent=logs.filter(x=>x.date===today()).reduce((n,x)=>n+Number(x.minutes||0),0)+' min';$('weekMinutes').textContent=mins+' min';$('sessionCount').textContent=weekly.length+' sessions';$('sessionLogs').innerHTML=logs.slice(0,20).map(x=>'<li class="task-row"><span><strong>'+esc(x.minutes)+' min · Unit '+esc(x.unit)+'</strong><small> '+esc(x.date)+(x.note?' · '+esc(x.note):'')+'</small></span><button class="btn" type="button" data-remove-session="'+esc(x.id)+'">Delete</button></li>').join('')||'<li class="local-note">No sessions recorded yet.</li>'}
$('timerPreset').addEventListener('change',()=>{if(interval)return;duration=Math.max(60,Number($('timerPreset').value)*60);remaining=duration;show()});
$('startTimer').addEventListener('click',()=>{if(interval)return;startedAt=Date.now();$('startTimer').disabled=true;$('pauseTimer').disabled=false;interval=setInterval(()=>{remaining=Math.max(0,remaining-1);show();if(remaining===0)stop(true)},1000);notice('timerStatus','Timer running. Keep this tab open while studying.')});
$('pauseTimer').addEventListener('click',()=>{stop(false);notice('timerStatus','Timer paused. Resume when ready.')});
$('finishTimer').addEventListener('click',()=>stop(true));
$('sessionLogs').addEventListener('click',e=>{const id=e.target.dataset.removeSession;if(!id)return;write(keys.sessions,read(keys.sessions,[]).filter(x=>x.id!==id));renderLogs()});
show();renderLogs();
}
function initBackup(){
if(!$('exportBackup'))return;
const keysToExport=[...Object.values(keys),'air-unit-practice-v1','air-exam-readiness-checklist-v1','air-exam-stats','air-exam-history','air-mistake-notebook-v1'];
$('exportBackup').addEventListener('click',()=>{const data={app:'IHRM Air',schemaVersion:1,exportedAt:new Date().toISOString(),data:{}};keysToExport.forEach(k=>{const raw=localStorage.getItem(k);if(raw!==null)data.data[k]=raw});const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ihrm-air-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('backupStatus','Backup exported. Store the file somewhere private.')});
$('importBackup').addEventListener('click',async()=>{const file=$('backupFile').files[0];if(!file){notice('backupStatus','Choose a JSON backup file first.');return}try{if(file.size>5*1024*1024)throw Error('Backup exceeds the 5 MB safety limit.');const data=JSON.parse(await file.text());if(data.app!=='IHRM Air'||data.schemaVersion!==1||!data.data||typeof data.data!=='object'||Array.isArray(data.data))throw Error('This is not a supported IHRM Air backup.');const allowed=new Set(keysToExport);for(const k of Object.keys(data.data)){if(!allowed.has(k)||typeof data.data[k]!=='string')throw Error('Backup contains an unsupported field: '+k);JSON.parse(data.data[k])}if(!confirm('Restore '+Object.keys(data.data).length+' data categories? Existing values for these categories will be replaced.'))return;Object.keys(data.data).forEach(k=>localStorage.setItem(k,data.data[k]));notice('backupStatus','Backup restored. Reload study pages to refresh displayed progress.')}catch(e){notice('backupStatus','Restore failed: '+e.message)}});
$('clearLocalData').addEventListener('click',()=>{if(confirm('Permanently clear IHRM Air study data stored on this device? Export a backup first if you need it.')){keysToExport.forEach(k=>localStorage.removeItem(k));notice('backupStatus','Local study data cleared from this browser.')}});
const list=$('backupContents');list.innerHTML=keysToExport.map(k=>'<li>'+esc(k)+': '+(localStorage.getItem(k)!==null?'data present':'empty')+'</li>').join('');
}
document.addEventListener('DOMContentLoaded',()=>{initPlanner();initTracker();initBackup()});
})();