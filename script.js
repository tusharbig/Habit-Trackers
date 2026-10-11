'use strict';
/* ---------- shared helpers (loaded on both pages) ---------- */
const KEY='ht_v1',$=(s,r=document)=>r.querySelector(s),pad=n=>String(n).padStart(2,'0');
const CATS=['Health','Fitness','Learning','Productivity','Mindfulness','Personal'];
const ICONS=['📚','💧','🏃','🧘','💪','🥗','😴','✍️','🎯','🎸','🧹','💊'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const dk=d=>`${String(d.getFullYear()).padStart(4,'0')}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const pd=s=>{const[y,m,d]=s.split('-').map(Number);const x=new Date(2000,m-1,d);x.setFullYear(y);return x};
const today=()=>dk(new Date());
const addDays=(k,n)=>{const d=pd(k);d.setDate(d.getDate()+n);return dk(d)};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const col=c=>/^#[0-9a-f]{6}$/i.test(c)?c:'#A99BF5';
const on=c=>{const n=parseInt(c.slice(1),16);return((n>>16)*299+(n>>8&255)*587+(n&255)*114)/1000>150?'#14211c':'#fff'};
const fmt=(k,o)=>pd(k).toLocaleDateString(undefined,o||{weekday:'long',year:'numeric',month:'long',day:'numeric'});

function h(t,p={},...k){const e=document.createElement(t);
 for(const[a,v]of Object.entries(p)){if(v===false||v==null)continue;
  if(a==='class')e.className=v;else if(a.startsWith('on'))e.addEventListener(a.slice(2),v);else e.setAttribute(a,v)}
 k.flat().forEach(c=>e.append(c instanceof Node?c:document.createTextNode(c??'')));return e}

function load(){let d;try{d=JSON.parse(localStorage.getItem(KEY))}catch(e){}
 if(!d||typeof d!=='object')d={};
 const habits=(Array.isArray(d.habits)?d.habits:[]).filter(x=>x&&x.id&&typeof x.name==='string').map(x=>({...x,desc:x.desc||'',icon:x.icon||'🎯',cat:x.cat||'Personal',color:col(x.color),days:Array.isArray(x.days)?x.days:[],start:x.start||today(),created:x.created||0}));
 const o=v=>v&&typeof v==='object'?v:{};
 return{habits,done:o(d.done),notes:o(d.notes),tasks:o(d.tasks),prefs:{theme:'light',...o(d.prefs)}}}
let S=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Could not save — browser storage is full or blocked.')}}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2400)}
function setTheme(t,quiet){S.prefs.theme=t;document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):t;if(!quiet)save()}

/* ---------- habit logic ---------- */
const sched=(x,k)=>(!x.start||k>=x.start)&&(!x.end||k<=x.end)&&(!x.days.length||x.days.includes(pd(k).getDay()));
const isDone=(id,k)=>!!(S.done[id]||{})[k];
function toggle(id,k){if(k>today())return null;const m=(S.done[id]=S.done[id]||{});if(m[k])delete m[k];else m[k]=true;save();return !!m[k]}
function stats(x){const dn=S.done[x.id]||{},t=today(),ks=Object.keys(dn).sort();
 const first=[x.start,ks[0]].filter(Boolean).sort()[0]||t;let run=0,best=0,d=0,s=0;
 for(let k=first;k<=t;k=addDays(k,1)){if(dn[k]){run++;d++;s++;best=Math.max(best,run)}else if(sched(x,k)&&k<t){run=0;s++}}
 return{cur:run,best,total:ks.length,rate:s?Math.round(d/s*100):0}}
function span(x,from,to){let d=0,s=0;const t=today();for(let k=from;k<=to;k=addDays(k,1)){const dn=isDone(x.id,k);if(dn)d++;if(dn||(sched(x,k)&&k<t))s++}return{d,s}}
const schedText=x=>x.days.length?x.days.map(i=>DAYS[i]).join(', '):'Every day';

function heat(from,to,lvl,color,tip){const g=h('div',{class:'heat',style:`--c:${color}`});let first=true;
 for(let k=from;k<=to;k=addDays(k,1)){const l=lvl(k),c=h('i',{class:l==null?'x':l>0?'':'z',title:tip(k)});
  if(l>0)c.style.opacity=(.3+.7*Math.min(l,1)).toFixed(2);
  if(first){c.style.gridRowStart=pd(k).getDay()+1;first=false}g.append(c)}
 return h('div',{class:'heatwrap'},g)}

/* ---------- dialogs ---------- */
function confirmBox(msg,label,cb){const d=h('dialog',{class:'dlg'},h('p',{},msg),h('div',{class:'row end'},
 h('button',{class:'btn ghost',type:'button',onclick:()=>d.close()},'Cancel'),
 h('button',{class:'btn danger',type:'button',onclick:()=>{d.close();cb()}},label)));
 d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal()}
function delHabit(x,after){confirmBox(`Delete “${x.name}” and all its history, notes and subtasks? This can't be undone.`,'Delete habit',()=>{
 S.habits=S.habits.filter(o=>o.id!==x.id);delete S.done[x.id];delete S.notes[x.id];delete S.tasks[x.id];save();toast('Habit deleted');after()})}

function habitForm(hb,after){
 const x=hb||{icon:ICONS[0],cat:CATS[0],color:'#A99BF5',days:[],start:today(),end:'',remind:''};let icon=x.icon;
 const dlg=h('dialog',{class:'dlg wide'}),err=h('p',{class:'err',role:'alert'});
 const fld=(l,e)=>h('label',{class:'fld'},h('span',{},l),e);
 const name=h('input',{required:'',maxlength:'60',value:x.name||'',placeholder:'e.g. Read 20 minutes'}),desc=h('textarea',{rows:'2',maxlength:'200'},x.desc||'');
 const cat=h('select',{},CATS.map(c=>h('option',{value:c},c)));cat.value=x.cat;
 const color=h('input',{type:'color',value:x.color});const dif=h('select',{},['Easy','Medium','Hard'].map(c=>h('option',{value:c},c)));dif.value=x.dif||'Medium';const pri=h('select',{},PRI.map(c=>h('option',{value:c},c)));pri.value=x.pri||'Normal';
 const st=h('input',{type:'date',required:'',value:x.start}),en=h('input',{type:'date',value:x.end||''}),rem=h('input',{type:'time',value:x.remind||''});
 const picks=ICONS.map(i=>h('button',{type:'button',class:'ic','aria-label':'Icon '+i,onclick:()=>{icon=i;mark()}},i));
 const mark=()=>picks.forEach(b=>b.classList.toggle('on',b.textContent===icon));mark();
 const custom=h('input',{maxlength:'4',placeholder:'Own emoji','aria-label':'Custom emoji',class:'mini',oninput:e=>{if(e.target.value.trim()){icon=e.target.value.trim();mark()}}});
 const dayBoxes=DAYS.map((d,i)=>{const c=h('input',{type:'checkbox'});c.checked=x.days.includes(i);return{c,l:h('label',{class:'chip pick'},c,d)}});
 const f=h('form',{onsubmit:e=>{e.preventDefault();const n=name.value.trim();err.textContent='';
  if(!n)return err.textContent='Give your habit a name.';
  if(S.habits.some(o=>o.id!==x.id&&o.name.toLowerCase()===n.toLowerCase()))return err.textContent='A habit with this name already exists.';
  if(!st.value)return err.textContent='Choose a start date.';
  if(en.value&&en.value<st.value)return err.textContent='The end date must be after the start date.';
  let days=dayBoxes.map((b,i)=>b.c.checked?i:-1).filter(i=>i>=0);if(days.length===7)days=[];
  const o={id:x.id||uid(),name:n,desc:desc.value.trim(),icon,cat:cat.value,color:color.value,days,start:st.value,end:en.value,remind:rem.value,dif:dif.value,pri:pri.value,created:x.created||Date.now()};
  if(hb)Object.assign(hb,o);else S.habits.push(o);save();dlg.close();toast(hb?'Changes saved':'Habit created');after()}},
  h('h2',{},hb?'Edit habit':'New habit'),fld('Name',name),fld('Description',desc),
  h('div',{class:'fld'},h('span',{},'Icon'),h('div',{class:'row wrap'},picks,custom)),
  h('div',{class:'two-f'},fld('Category',cat),h('div',{class:'fld'},h('span',{},'Calendar colour'),h('div',{class:'row wrap'},color,PAL.map(c=>h('button',{type:'button',class:'sw',style:`background:${c}`,'aria-label':'Colour '+c,onclick:()=>{color.value=c}}))))),h('div',{class:'two-f'},fld('Difficulty',dif),fld('Priority',pri)),
  h('div',{class:'fld'},h('span',{},'Repeat on (none selected = every day)'),h('div',{class:'row wrap'},dayBoxes.map(b=>b.l))),
  h('div',{class:'two-f'},fld('Start date',st),fld('Target end date (optional)',en)),
  fld('Reminder time (optional — shown as an in-app alert while Streakline is open)',rem),err,
  h('div',{class:'row end'},h('button',{class:'btn ghost',type:'button',onclick:()=>dlg.close()},'Cancel'),h('button',{class:'btn',type:'submit'},hb?'Save changes':'Create habit')));
 dlg.append(f);dlg.addEventListener('close',()=>dlg.remove());document.body.append(dlg);dlg.showModal();name.focus()}

/* ---------- extras ---------- */
const PAL=['#F8C8E6','#FBD18B','#CDEB8F','#A99BF5','#BDE5F5','#FF9AA2'],PRI=['Low','Normal','High'];
const A=()=>S.habits.filter(x=>!x.archived);
const noteText=id=>Object.values(S.notes[id]||{}).flat().map(n=>`${n.title||''} ${n.text||''} ${(n.tags||[]).join(' ')}`).join(' ');
function confetti(el){if(!el||matchMedia('(prefers-reduced-motion:reduce)').matches)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 for(let i=0;i<28;i++){const p=h('i',{class:'cf',style:`left:${cx}px;top:${cy}px;background:${PAL[i%6]};--dx:${(Math.random()-.5)*280}px;--dy:${-80-Math.random()*160}px;--rot:${Math.random()*720}deg`});document.body.append(p);setTimeout(()=>p.remove(),1100)}}
function afterToggle(x,r,el){if(!r)return toast('Completion removed');const c=stats(x).cur;confetti(el);toast([7,30,100].includes(c)?`🏅 ${c}-day streak unlocked!`:'Marked complete ✓')}
function remind(x){toast('Reminder: '+x.name);if('Notification' in window&&Notification.permission==='granted')new Notification('Streakline',{body:x.name})}
function focusPanel(due,t){const todo=due.filter(x=>!isDone(x.id,t)).sort((a,b)=>PRI.indexOf(b.pri||'Normal')-PRI.indexOf(a.pri||'Normal')).slice(0,3);
 return h('section',{class:'panel focus'},h('h3',{},'Today\'s focus'),todo.length?h('div',{class:'row wrap'},todo.map(x=>h('a',{class:'fchip',style:`--c:${x.color}`,href:'habit.html?id='+encodeURIComponent(x.id)},x.icon+' '+x.name))):h('p',{class:'mut'},due.length?'Everything for today is done. 🎉':'No habits scheduled today.'))}
function review(t){const r=A().map(x=>({x,...span(x,addDays(t,-6),t)})),tot=r.reduce((a,o)=>a+o.d,0),wins=r.filter(o=>o.s&&o.d===o.s),miss=r.filter(o=>o.s&&o.d<o.s/2).sort((a,b)=>a.d/a.s-b.d/b.s);
 const li=(a,f,e)=>a.length?a.map(o=>h('li',{},f(o))):[h('li',{class:'mut'},e)];
 return h('section',{class:'panel review'},h('h3',{},'Weekly review'),h('p',{},`${tot} completion${tot===1?'':'s'} in the last 7 days.`),
  h('h4',{},'Wins'),h('ul',{class:'li'},li(wins,o=>`${o.x.icon} ${o.x.name} — perfect week`,'No perfect weeks yet.')),
  h('h4',{},'Missed targets'),h('ul',{class:'li'},li(miss,o=>`${o.x.icon} ${o.x.name} — ${o.d} of ${o.s}`,'Nothing below half. Nice.')),
  h('h4',{},'Next week'),h('p',{class:'mut'},miss.length?`Aim to complete “${miss[0].x.name}” at least ${miss[0].d+1} times.`:'Keep your pace and try one stretch day.'))}
function dl(name,text,type){const a=h('a',{href:URL.createObjectURL(new Blob([text],{type})),download:name});document.body.append(a);a.click();a.remove()}
function csv(){const q=v=>'"'+String(v).replace(/"/g,'""')+'"',rows=['Habit,Category,Date'];S.habits.forEach(x=>Object.keys(S.done[x.id]||{}).sort().forEach(k=>rows.push([q(x.name),q(x.cat),k].join(','))));dl(`streakline-history-${today()}.csv`,rows.join('\n'),'text/csv');toast('CSV downloaded')}
function importData(file){const r=new FileReader();r.onload=()=>{let d;try{d=JSON.parse(r.result)}catch(e){return toast('That file is not valid JSON.')}
 if(!d||!Array.isArray(d.habits)||d.habits.some(x=>!x||typeof x.id!=='string'||typeof x.name!=='string'))return toast('That file is not a Streakline backup.');
 confirmBox(`Replace your current data with ${d.habits.length} habit(s) from this backup?`,'Restore backup',()=>{localStorage.setItem(KEY,JSON.stringify(d));S=load();toast('Backup restored');render()})};r.readAsText(file)}
function demo(){if(S.habits.some(x=>x.id.startsWith('demo_')))return toast('Demo data is already loaded.');const t=today();
 [['Morning run','🏃','Fitness','#CDEB8F',.75],['Read 20 minutes','📚','Learning','#F8C8E6',.85],['Meditate','🧘','Mindfulness','#A99BF5',.6],['Drink 2L water','💧','Health','#BDE5F5',.9]].forEach(([name,icon,cat,color,p],n)=>{
  const id='demo_'+n;S.habits.push({id,name,icon,cat,color,desc:'Sample habit — safe to delete.',days:[],start:addDays(t,-75),end:'',remind:'',dif:'Medium',pri:'Normal',created:Date.now()+n});
  const m=(S.done[id]={});for(let i=1;i<=60;i++)if(((i*7+n*13)%10)/10<p)m[addDays(t,-i)]=true;
  S.notes[id]={[addDays(t,-1)]:[{id:uid(),title:'Felt good',text:'Easier than last week.',tags:['win'],at:Date.now()}]}});save();toast('Demo data loaded');render()}
function undemo(){const ids=S.habits.filter(x=>x.id.startsWith('demo_')).map(x=>x.id);if(!ids.length)return toast('No demo data to remove.');
 S.habits=S.habits.filter(x=>!ids.includes(x.id));ids.forEach(i=>{delete S.done[i];delete S.notes[i];delete S.tasks[i]});save();toast('Demo data removed')}

/* ---------- dashboard (index.html) ---------- */
const Q=["Small steps, done daily, add up.","Consistency beats intensity.","Show up today. That's the whole job.","Don't break the chain.","Progress, not perfection.","What you repeat, you become."];
const ui={q:'',cat:'all',sort:'name',st:'all'};

function navSetup(){const dr=$('#drawer'),sc=$('#scrim'),mb=$('.menuBtn'),cb=$('#collapseBtn');let back;
 const open=o=>{dr.classList.toggle('open',o);sc.classList.toggle('show',o);dr.inert=!o;$('#app').inert=o;mb.setAttribute('aria-expanded',String(o));document.body.classList.toggle('lock',o);if(o){back=document.activeElement;$('a',dr).focus()}else if(back)back.focus()};
 dr.inert=true;mb.onclick=()=>open(true);sc.onclick=()=>open(false);$('#drawerClose').onclick=()=>open(false);
 dr.addEventListener('click',e=>{const b=e.target.closest('[data-act]'),a=e.target.closest('a');if(b||a){open(false);if(b)setTimeout(add,0)}});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&dr.classList.contains('open'))open(false)});
 matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches&&dr.classList.contains('open'))open(false)});
 const slim=(v,keep)=>{document.body.classList.toggle('slim',v);cb.setAttribute('aria-pressed',String(v));cb.setAttribute('aria-label',v?'Expand sidebar':'Collapse sidebar');$('i',cb).textContent=v?'»':'«';if(!keep){S.prefs.slim=v;save()}};
 slim(!!S.prefs.slim,true);cb.onclick=()=>slim(!document.body.classList.contains('slim'));$('#fab').onclick=add}
function initDash(){setTheme(S.prefs.theme,true);
 document.querySelectorAll('.themeBtn').forEach(b=>b.onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));navSetup();
 addEventListener('hashchange',render);render();
 setInterval(()=>{const n=new Date(),hm=pad(n.getHours())+':'+pad(n.getMinutes());
  S.habits.forEach(x=>{if(x.remind===hm&&sched(x,today())&&!isDone(x.id,today()))remind(x)})},30000)}

function render(){const v=(location.hash||'#dashboard').slice(1),app=$('#app');app.replaceChildren();document.body.dataset.view=v;
 document.querySelectorAll('[data-v]').forEach(a=>a.setAttribute('aria-current',a.dataset.v===v?'page':'false'));
 ({dashboard:()=>dash(app,true),habits:()=>dash(app,false),analytics:()=>analytics(app),settings:()=>settings(app)}[v]||(()=>dash(app,true)))()}

function dash(app,full){const t=today(),now=new Date();
 const due=A().filter(x=>sched(x,t)),dn=due.filter(x=>isDone(x.id,t));
 const pct=due.length?Math.round(dn.length/due.length*100):0;
 const wk=A().reduce((a,x)=>{const r=span(x,addDays(t,-6),t);return{d:a.d+r.d,s:a.s+r.s}},{d:0,s:0});
 const rates=A().map(x=>stats(x).rate),overall=rates.length?Math.round(rates.reduce((a,b)=>a+b,0)/rates.length):0;
 if(full){
  const hr=now.getHours(),doy=Math.floor((now-new Date(now.getFullYear(),0,0))/864e5);
  const msg=!S.habits.length?'Create your first habit to get started.':!due.length?'Nothing scheduled today. Enjoy the rest day.':pct===100?'All done for today. Well earned.':pct>=50?'More than halfway there. Keep going.':dn.length?'Good start — one more to build momentum.':'Pick the easiest one and begin.';
  const rg=h('div',{class:'ringbox'});rg.innerHTML='<svg viewBox="0 0 100 100" class="ring" aria-hidden="true"><circle cx="50" cy="50" r="44" class="rb"/><circle cx="50" cy="50" r="44" class="rf" style="stroke-dasharray:0 277"/></svg>';
  rg.append(h('b',{},pct+'%'));requestAnimationFrame(()=>{$('.rf',rg).style.strokeDasharray=`${2*Math.PI*44*pct/100} 277`});
  app.append(h('header',{class:'hero'},h('div',{},h('h1',{},`Good ${hr<12?'morning':hr<18?'afternoon':'evening'}`),h('p',{class:'mut'},fmt(t)),h('p',{class:'quote'},'“'+Q[doy%Q.length]+'”')),
   h('div',{class:'ringcard'},rg,h('p',{},msg))),
   h('div',{class:'tiles'},[['Completed today',dn.length],['Remaining',due.length-dn.length],['Last 7 days',(wk.s?Math.round(wk.d/wk.s*100):0)+'%'],['Overall rate',overall+'%']].map(([l,v])=>h('div',{class:'tile'},h('b',{},String(v)),h('span',{},l)))))}
 else app.append(h('h1',{class:'pg'},'All habits'));
 const grid=h('div',{class:'grid'});
 const fill=()=>{const q=ui.q.toLowerCase();
  const a=S.habits.filter(x=>(ui.st==='archived'?!!x.archived:!x.archived)&&(ui.cat==='all'||x.cat===ui.cat)&&(x.name+' '+x.desc+' '+(q?noteText(x.id):'')).toLowerCase().includes(q)&&(['all','archived'].includes(ui.st)||(ui.st==='done')===isDone(x.id,t)));
  a.sort({name:(p,q)=>p.name.localeCompare(q.name),streak:(p,q)=>stats(q).cur-stats(p).cur,rate:(p,q)=>stats(q).rate-stats(p).rate,new:(p,q)=>q.created-p.created,pri:(p,q)=>PRI.indexOf(q.pri||'Normal')-PRI.indexOf(p.pri||'Normal')}[ui.sort]);
  grid.replaceChildren(...(a.length?a.map((x,i)=>{const c=card(x);c.style.setProperty('--i',Math.min(i,10));return c}):[h('div',{class:'empty'},h('h2',{},S.habits.length?'No habits match':'No habits yet'),h('p',{},S.habits.length?'Try a different search or filter.':'Add a habit, then click its card to open its calendar.'),
   S.habits.length?h('button',{class:'btn ghost',onclick:()=>{Object.assign(ui,{q:'',cat:'all',st:'all'});render()}},'Clear filters'):h('button',{class:'btn',onclick:add},'Create a habit'))]))};
 const sel=(l,k,o)=>{const s=h('select',{'aria-label':l,onchange:e=>{ui[k]=e.target.value;fill()}},o.map(([v,t])=>h('option',{value:v},t)));s.value=ui[k];return s};
 if(full)app.append(focusPanel(due,t));app.append(h('div',{class:'ctrl'},h('input',{type:'search','aria-label':'Search habits',placeholder:'Search habits',value:ui.q,oninput:e=>{ui.q=e.target.value;fill()}}),
  sel('Category','cat',[['all','All categories'],...CATS.map(c=>[c,c])]),sel('Status today','st',[['all','Any status'],['done','Done today'],['todo','Not done'],['archived','Archived']]),
  sel('Sort','sort',[['name','Name'],['streak','Streak'],['rate','Completion'],['pri','Priority'],['new','Newest']]),h('button',{class:'btn',onclick:add},'+ New habit')),grid);fill()}
const add=()=>habitForm(null,render);

function card(x){const t=today(),s=stats(x),d=isDone(x.id,t),url='habit.html?id='+encodeURIComponent(x.id);
 const c=h('article',{class:'card',style:`--c:${x.color};--on:${on(x.color)}`},
  h('div',{class:'top'},h('span',{class:'big'},x.icon),h('div',{class:'grow'},h('a',{class:'ttl',href:url},x.name),h('div',{class:'chips'},h('span',{class:'chip'},x.cat),h('span',{class:'chip'},schedText(x)),h('span',{class:'chip pri-'+(x.pri||'Normal')},(x.pri||'Normal')+' priority'),h('span',{class:'chip'},x.dif||'Medium'))),
   h('button',{class:'chk'+(d?' on':''),'aria-pressed':String(d),'aria-label':(d?'Mark incomplete: ':'Mark complete: ')+x.name,title:sched(x,t)?'':'Not scheduled today',onclick:e=>{e.stopPropagation();const el=e.currentTarget,r=toggle(x.id,t);afterToggle(x,r,el);render()}},d?'✓':'+')),
  h('p',{class:'mut desc'},x.desc||'No description'),
  h('div',{class:'trio'},[['Streak',s.cur+'d'],['Best',s.best+'d'],['Done',s.rate+'%']].map(([l,v])=>h('div',{},h('b',{},v),h('span',{},l)))),
  h('div',{class:'bar'},h('i',{style:`width:${s.rate}%`})),
  h('div',{class:'row end'},h('button',{class:'btn s ghost',onclick:e=>{e.stopPropagation();habitForm(x,render)}},'Edit'),h('button',{class:'btn s ghost',onclick:e=>{e.stopPropagation();x.archived=!x.archived;save();toast(x.archived?'Habit archived':'Habit restored');render()}},x.archived?'Restore':'Archive'),h('button',{class:'btn s ghost danger',onclick:e=>{e.stopPropagation();delHabit(x,render)}},'Delete')));
 c.addEventListener('click',e=>{if(!e.target.closest('button,a'))location.href=url});return c}

function analytics(app){const t=today();app.append(h('h1',{class:'pg'},'Analytics'));
 if(!A().length)return app.append(h('div',{class:'empty'},h('h2',{},'Nothing to analyse yet'),h('p',{},'Create a habit and complete it a few times.')));
 const bars=a=>h('div',{class:'bars'},a.map(([l,v,tp])=>h('div',{class:'b',title:tp},h('i',{style:`height:${Math.round(v*100)}%`}),h('span',{},l))));
 const week=[...Array(7)].map((_,i)=>addDays(t,i-6)).map(k=>{let d=0,s=0;A().forEach(x=>{const dn=isDone(x.id,k);if(dn)d++;if(dn||sched(x,k))s++});return[fmt(k,{weekday:'short'}),s?d/s:0,`${d}/${s} habits`]});
 const months=[5,4,3,2,1,0].map(i=>{const n=new Date(),a=new Date(n.getFullYear(),n.getMonth()-i,1),e=new Date(a.getFullYear(),a.getMonth()+1,0),to=dk(e)>t?t:dk(e);
  const r=A().reduce((q,x)=>{const z=span(x,dk(a),to);return{d:q.d+z.d,s:q.s+z.s}},{d:0,s:0});return[a.toLocaleDateString(undefined,{month:'short'}),r.s?r.d/r.s:0,`${r.d}/${r.s}`]});
 const r30=A().map(x=>({x,r:span(x,addDays(t,-29),t)})).filter(o=>o.r.s>0).map(o=>({...o,p:Math.round(o.r.d/o.r.s*100)}));
 const list=(a,e)=>a.length?h('ul',{class:'li'},a.map(o=>h('li',{},`${o.x.icon} ${o.x.name} — ${o.p}%`))):h('p',{class:'mut'},e);
 const P=(t,...c)=>h('section',{class:'panel'},h('h3',{},t),...c);
 app.append(h('div',{class:'charts'},P('Last 7 days',bars(week)),P('Last 6 months',bars(months))),
  h('div',{class:'charts'},P('Best performers (30 days)',list([...r30].sort((a,b)=>b.p-a.p).slice(0,3),'No data yet.')),P('Needs attention',list(r30.filter(o=>o.p<60).sort((a,b)=>a.p-b.p).slice(0,3),'Everything is on track. 🎉'))),
  review(t),P('Consistency, past year',heat(addDays(t,-364),t,k=>k>t?null:A().filter(x=>isDone(x.id,k)).length/A().length,'var(--acc)',k=>`${k}: ${A().filter(x=>isDone(x.id,k)).length} completed`)),
  P('Milestones',h('div',{class:'badges'},A().flatMap(x=>{const b=stats(x).best;return[7,30,100].map(m=>h('span',{class:'badge'+(b>=m?' got':'')},(b>=m?'🏅 ':'🔒 ')+m+'-day · '+x.name))}))))}

function settings(app){
 const th=h('select',{'aria-label':'Theme',onchange:e=>setTheme(e.target.value)},[['light','Light'],['dark','Dark'],['system','Match my device']].map(([v,l])=>h('option',{value:v},l)));th.value=S.prefs.theme;
 const file=h('input',{type:'file',accept:'application/json,.json',class:'hide','aria-label':'Backup file',onchange:e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=''}});
 const P=(t,...c)=>h('section',{class:'panel'},h('h3',{},t),...c);
 app.append(h('h1',{class:'pg'},'Settings'),
  P('Appearance',h('label',{class:'fld'},h('span',{},'Theme'),th)),
  P('Reminders',h('p',{class:'mut'},'Reminder times alert you while Streakline is open in a tab. Browsers cannot notify you once the page is closed without a server.'),h('button',{class:'btn',onclick:()=>{if(!('Notification' in window))return toast('This browser does not support notifications.');Notification.requestPermission().then(p=>toast(p==='granted'?'Notifications enabled':'Notifications blocked'))}},'Enable browser notifications')),
  P('Your data',h('p',{class:'mut'},'Data is saved in this browser\'s localStorage. It is not synced across devices, and clearing site data erases it. Export backups regularly.'),
   h('div',{class:'row wrap'},h('button',{class:'btn',onclick:()=>{dl(`streakline-backup-${today()}.json`,JSON.stringify(S,null,2),'application/json');toast('Backup downloaded')}},'Export JSON'),h('button',{class:'btn ghost',onclick:csv},'Export history CSV'),h('button',{class:'btn ghost',onclick:()=>file.click()},'Import JSON'),file)),
  P('Demo data',h('p',{class:'mut'},'Load four sample habits with 60 days of history to explore the app. Removing them never touches your own habits.'),h('div',{class:'row wrap'},h('button',{class:'btn',onclick:demo},'Load demo data'),h('button',{class:'btn ghost',onclick:undemo},'Remove demo data'))),
  P('Danger zone',h('button',{class:'btn danger ghost',onclick:()=>confirmBox('Erase all habits, history, notes and subtasks?','Erase everything',()=>{localStorage.removeItem(KEY);S=load();toast('All data erased');render()})},'Erase all data')))}

if(document.body.dataset.page==='dash')initDash();
