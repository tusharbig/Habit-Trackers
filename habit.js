'use strict';
/* Individual habit page — uses helpers from script.js */
const app=$('#app'),hid=new URLSearchParams(location.search).get('id'),H=S.habits.find(x=>x.id===hid);
let sel=today(),cur={y:+today().slice(0,4),m:+today().slice(5,7)-1},hy=cur.y,editing=null;
setTheme(S.prefs.theme,true);

const items=(kind,k)=>(S[kind][H.id]||{})[k]||[];
function setItems(kind,k,a){const m=(S[kind][H.id]=S[kind][H.id]||{});if(a.length)m[k]=a;else delete m[k];save()}
const keyOf=(y,m,d)=>`${String(y).padStart(4,'0')}-${pad(m+1)}-${pad(d)}`;
const goMonth=n=>{let m=cur.m+n,y=cur.y;while(m<0){m+=12;y--}while(m>11){m-=12;y++}if(y<1000||y>9999)return toast('Calendar range is years 1000–9999');cur={y,m};draw()};
const syncMonth=k=>{cur={y:+k.slice(0,4),m:+k.slice(5,7)-1}};

function pick(k,tog){sel=k;syncMonth(k);
 if(tog){if(k>today())toast('Future dates can\'t be completed yet.');else{const r=toggle(H.id,k);afterToggle(H,r,$(`.day[data-k="${k}"] .n`))}}
 editing=null;draw(true)}

let flt='all',nq='';
const fmatch=k=>{const dn=isDone(H.id,k),s=sched(H,k);return flt==='done'?dn:flt==='missed'?!dn&&s&&k<today():flt==='sched'?s:!s};
const tags=s=>s.split(',').map(t=>t.trim().replace(/^#/,'')).filter(Boolean).slice(0,6);
function recentBlock(){const ks=Object.keys(S.done[H.id]||{}).sort().reverse().slice(0,8);
 return h('section',{class:'panel'},h('h3',{},'Recent activity'),ks.length?h('ul',{class:'li'},ks.map(k=>h('li',{},h('button',{class:'linkb',onclick:()=>pick(k,false)},'✓ '+fmt(k,{weekday:'short',month:'short',day:'numeric',year:'numeric'}))))):h('p',{class:'mut'},'No completions yet. Click a date on the calendar to log one.'))}
function head(){return h('header',{class:'hh'},h('a',{class:'btn ghost back',href:'index.html'},'← Back to dashboard'),
 h('div',{class:'ht'},h('span',{class:'big'},H.icon),h('div',{},h('h1',{},H.name),h('p',{class:'mut'},H.desc||'No description'),
  h('div',{class:'chips'},h('span',{class:'chip'},H.cat),h('span',{class:'chip'},schedText(H)),h('span',{class:'chip'},'Since '+fmt(H.start,{year:'numeric',month:'short',day:'numeric'})),H.end?h('span',{class:'chip'},'Target '+fmt(H.end,{year:'numeric',month:'short',day:'numeric'})):''))),
 h('div',{class:'row'},h('button',{class:'btn',onclick:()=>habitForm(H,()=>draw())},'Edit habit'),h('button',{class:'btn ghost danger',onclick:()=>delHabit(H,()=>location.href='index.html')},'Delete')))}

function statsBlock(){const t=today(),s=stats(H),w=span(H,addDays(t,-6),t),mo=span(H,t.slice(0,8)+'01',t);
 const tiles=[['Current streak',s.cur+' days'],['Longest streak',s.best+' days'],['Total days',s.total],['Completion rate',s.rate+'%'],['This week',`${w.d}/${w.s||w.d}`],['This month',`${mo.d}/${mo.s||mo.d}`]];
 return h('div',{},h('div',{class:'tiles six'},tiles.map(([l,v])=>h('div',{class:'tile'},h('b',{},String(v)),h('span',{},l)))),
  h('div',{class:'badges'},[7,30,100].map(m=>h('span',{class:'badge'+(s.best>=m?' got':'')},(s.best>=m?'🏅 ':'🔒 ')+m+'-day streak'))))}

function calBlock(){const t=today(),{y,m}=cur,n=new Date(y,m+1,0).getDate(),lead=new Date(y,m,1).getDay();let d=0,s=0;
 for(let i=1;i<=n;i++){const k=keyOf(y,m,i);if(k>t)break;const dn=isDone(H.id,k);if(dn)d++;if(dn||sched(H,k))s++}
 const grid=h('div',{class:'calgrid',role:'grid','aria-label':'Calendar',onkeydown:e=>{
  const mv={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
  if(mv){e.preventDefault();sel=addDays(sel,mv);syncMonth(sel);draw(true)}
  else if(e.key==='PageUp'||e.key==='PageDown'){e.preventDefault();const dir=e.key==='PageUp'?-1:1;let mm=cur.m+dir,yy=cur.y;if(mm<0){mm=11;yy--}if(mm>11){mm=0;yy++}
   if(yy<1000||yy>9999)return;sel=keyOf(yy,mm,Math.min(+sel.slice(8),new Date(yy,mm+1,0).getDate()));syncMonth(sel);draw(true)}}});
 ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(w=>grid.append(h('span',{class:'dow'},w)));
 for(let i=0;i<lead;i++)grid.append(h('span'));
 const selIn=sel.slice(0,7)===keyOf(y,m,1).slice(0,7);
 for(let i=1;i<=n;i++){const k=keyOf(y,m,i),dn=isDone(H.id,k),fu=k>t;
  const cls=['day',dn&&'done',k===t&&'today',k===sel&&'sel',fu&&'future',!sched(H,k)&&'off',flt!=='all'&&!fmatch(k)&&'dim',(items('notes',k).length||items('tasks',k).length)&&'has'].filter(Boolean).join(' ');
  grid.append(h('button',{class:cls,type:'button','data-k':k,tabindex:(selIn?k===sel:i===1)?'0':'-1','aria-pressed':String(dn),
   'aria-label':fmt(k)+(dn?', completed':fu?', future':''),title:fmt(k)+(dn?' — completed':''),onclick:()=>pick(k,true)},h('span',{class:'n'},String(i))))}
 const ms=h('select',{'aria-label':'Month',onchange:e=>{cur.m=+e.target.value;draw()}},[...Array(12)].map((_,i)=>h('option',{value:i},new Date(2000,i,1).toLocaleDateString(undefined,{month:'long'}))));ms.value=cur.m;
 const yi=h('input',{type:'number',class:'yr','aria-label':'Year',value:cur.y,onchange:e=>{const v=Math.round(+e.target.value);if(v>=1000&&v<=9999){cur.y=v;draw()}else{toast('Enter a year between 1000 and 9999');e.target.value=cur.y}}});
 const fsel=h('select',{'aria-label':'Calendar filter',onchange:e=>{flt=e.target.value;draw()}},[['all','All days'],['done','Completed'],['missed','Missed'],['sched','Scheduled'],['rest','Rest days']].map(([v,l])=>h('option',{value:v},l)));fsel.value=flt;
 return h('section',{class:'panel'},h('div',{class:'calbar'},h('button',{class:'btn s ghost','aria-label':'Previous month',onclick:()=>goMonth(-1)},'‹'),ms,yi,h('button',{class:'btn s ghost','aria-label':'Next month',onclick:()=>goMonth(1)},'›'),
  h('button',{class:'btn s',onclick:()=>{sel=t;syncMonth(t);draw(true)}},'Today'),fsel),grid,
  h('p',{class:'mut'},`${new Date(y,m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'})}: ${d} completed${s?` of ${s} scheduled (${Math.round(d/s*100)}%)`:''}. Click a date to complete or undo it.`))}

function dayBlock(){const t=today(),dn=isDone(H.id,sel),fu=sel>t;
 return h('section',{class:'panel'},h('h3',{},fmt(sel)),h('div',{class:'chips'},sel===t?h('span',{class:'chip'},'Today'):'',fu?h('span',{class:'chip'},'Future'):'',!sched(H,sel)?h('span',{class:'chip'},'Not scheduled'):'',h('span',{class:'chip '+(dn?'ok':'')},dn?'Completed':'Not completed')),
  h('button',{class:'btn wide',disabled:fu?'':null,onclick:()=>pick(sel,true)},fu?'Can\'t complete future dates':dn?'Undo completion':'Mark complete'))}

function listSec(kind){const isT=kind==='tasks',a=items(kind,sel),dn=a.filter(x=>x.done).length,rerender=()=>{setItems(kind,sel,a);draw()};
 const sec=h('section',{class:'panel'},h('h3',{},isT?'Subtasks':'Notes',isT&&a.length?h('small',{},` ${dn} of ${a.length} completed`):''));
 if(isT&&a.length)sec.append(h('div',{class:'bar'},h('i',{style:`width:${dn/a.length*100}%`})));
 if(!isT){sec.append(h('input',{type:'search',placeholder:'Search all notes for this habit','aria-label':'Search notes',value:nq,oninput:e=>{nq=e.target.value;draw();const s=$('[aria-label="Search notes"]');s.focus();s.setSelectionRange(nq.length,nq.length)}}));
  if(nq){const q=nq.toLowerCase(),hits=Object.entries(S.notes[H.id]||{}).flatMap(([k,arr])=>arr.filter(n=>`${n.title||''} ${n.text} ${(n.tags||[]).join(' ')}`.toLowerCase().includes(q)).map(n=>[k,n])).sort((p,q)=>q[0].localeCompare(p[0]));
   sec.append(h('ul',{class:'li hits'},hits.length?hits.map(([k,n])=>h('li',{},h('button',{class:'linkb',onclick:()=>pick(k,false)},fmt(k,{month:'short',day:'numeric',year:'numeric'})+' — '+(n.title||n.text).slice(0,50)))):h('li',{class:'mut'},'No notes match.')))}}
 const ul=h('ul',{class:'li'});
 a.forEach((x,i)=>{const li=h('li');
  if(editing===x.id){const ti=isT?null:h('input',{value:x.title||'',maxlength:'80',placeholder:'Title','aria-label':'Title'}),ta=h('textarea',{rows:'2',maxlength:'2000'},x.text),tg=isT?null:h('input',{value:(x.tags||[]).join(', '),placeholder:'tags, comma separated','aria-label':'Tags'});
   li.append(...[ti,ta,tg].filter(Boolean),h('div',{class:'row'},h('button',{class:'btn s',onclick:()=>{const v=ta.value.trim();if(!v)return toast('Text can\'t be empty');x.text=v;if(!isT){x.title=ti.value.trim();x.tags=tags(tg.value)}editing=null;rerender()}},'Save'),h('button',{class:'btn s ghost',onclick:()=>{editing=null;draw()}},'Cancel')))}
  else{if(isT){const c=h('input',{type:'checkbox','aria-label':'Complete: '+x.text,onchange:e=>{x.done=e.target.checked;rerender()}});c.checked=!!x.done;li.append(h('label',{class:'cbx'},c))}
   li.append(h('div',{class:'grow'+(x.done?' strike':'')},!isT&&x.title?h('b',{},x.title):'',h('div',{},x.text),
     h('div',{class:'chips'},isT?[x.pri&&x.pri!=='Normal'?h('span',{class:'chip pri-'+x.pri},x.pri):'',x.due?h('span',{class:'chip'},'⏰ '+x.due):'']:[...(x.tags||[]).map(t=>h('span',{class:'chip'},'#'+t)),x.at?h('span',{class:'chip'},new Date(x.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})):''])),
    isT?h('button',{class:'ib','aria-label':'Move up',disabled:i?null:'',onclick:()=>{[a[i-1],a[i]]=[a[i],a[i-1]];rerender()}},'↑'):'',
    isT?h('button',{class:'ib','aria-label':'Move down',disabled:i<a.length-1?null:'',onclick:()=>{[a[i+1],a[i]]=[a[i],a[i+1]];rerender()}},'↓'):'',
    h('button',{class:'ib','aria-label':'Edit',onclick:()=>{editing=x.id;draw()}},'✎'),h('button',{class:'ib','aria-label':'Delete',onclick:()=>{a.splice(i,1);rerender();toast((isT?'Subtask':'Note')+' deleted')}},'✕'))}
  ul.append(li)});
 if(!a.length)ul.append(h('li',{class:'mut'},isT?'No subtasks for this day.':'No notes for this day.'));
 const ti=h('input',{maxlength:isT?'120':'80',placeholder:isT?'Add a subtask':'Note title (optional)','aria-label':isT?'New subtask':'Note title'}),
  ta=isT?null:h('textarea',{rows:'2',maxlength:'2000',placeholder:'What happened today?','aria-label':'New note'}),tg=isT?null:h('input',{placeholder:'tags, comma separated','aria-label':'Tags'}),
  pr=isT?h('select',{'aria-label':'Priority'},['Normal','High','Low'].map(p=>h('option',{value:p},p))):null,du=isT?h('input',{type:'time','aria-label':'Due time'}):null;
 sec.append(ul,h('form',{class:'add col',onsubmit:e=>{e.preventDefault();
  if(isT){const v=ti.value.trim();if(!v)return toast('Type something first');a.push({id:uid(),text:v,done:false,pri:pr.value,due:du.value})}
  else{const v=ta.value.trim();if(!v)return toast('Write a note first');a.push({id:uid(),title:ti.value.trim(),text:v,tags:tags(tg.value),at:Date.now()})}
  toast(isT?'Subtask added':'Note saved');rerender()}},...[ti,ta,tg].filter(Boolean),isT?h('div',{class:'row'},pr,du):'',h('button',{class:'btn s',type:'submit'},'Add '+(isT?'subtask':'note'))));
 return sec}

function heatBlock(){const t=today(),c=col(H.color);let n=0;
 for(let k=`${String(hy).padStart(4,'0')}-01-01`;k.slice(0,4)===String(hy).padStart(4,'0');k=addDays(k,1))if(isDone(H.id,k))n++;
 return h('section',{class:'panel'},h('div',{class:'calbar'},h('h3',{},'Year overview'),h('button',{class:'btn s ghost','aria-label':'Previous year',onclick:()=>{hy--;draw()}},'‹'),h('b',{},String(hy)),h('button',{class:'btn s ghost','aria-label':'Next year',onclick:()=>{hy++;draw()}},'›')),
  heat(`${String(hy).padStart(4,'0')}-01-01`,`${String(hy).padStart(4,'0')}-12-31`,k=>k>t?null:isDone(H.id,k)?1:0,c,k=>fmt(k,{year:'numeric',month:'short',day:'numeric'})+(isDone(H.id,k)?' — completed':'')),
  h('p',{class:'mut'},`${n} completed day${n===1?'':'s'} in ${hy}.`))}

function draw(f){app.replaceChildren();app.style.setProperty('--c',col(H.color));app.style.setProperty('--on',on(col(H.color)));document.title=H.name+' — Streakline';
 app.append(head(),statsBlock(),h('div',{class:'two'},calBlock(),h('div',{class:'stack'},dayBlock(),listSec('tasks'),listSec('notes'))),heatBlock(),recentBlock());
 if(f){const b=$(`.day[data-k="${sel}"]`);if(b)b.focus()}}

if(!H)app.append(h('div',{class:'empty'},h('h1',{},'Habit not found'),h('p',{},'It may have been deleted, or the link is incomplete.'),h('a',{class:'btn',href:'index.html'},'Back to dashboard')));
else draw();
