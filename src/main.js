import {createState,tick,buyUpgrade,assignCrew,releaseCrew,beginRitual,UPGRADES,serialise,restore,walkable,notify} from './game.js';
import {SaveStore} from './storage.js';
import {Renderer} from './renderer.js';
import {DustAudio} from './audio.js';

const $=id=>document.getElementById(id);
let browserStorage;
try{browserStorage=window.localStorage;}catch{browserStorage={getItem(){throw Error('Storage unavailable');},setItem(){throw Error('Storage unavailable');},removeItem(){throw Error('Storage unavailable');}};}
const store=new SaveStore(browserStorage);
let state=store.load()||createState();
const canvas=$('world'),renderer=new Renderer(canvas),audio=new DustAudio();
let started=false,paused=true,lastTime=performance.now(),lastSave=0,lastUI=0,autoSweep=0,birth=null,birthUntil=0,completionShown=state.completed;
let zoom=1,camera={x:500,y:390},lastPointer=null,pointerId=null,panning=false,pointerMoved=false;
const frames=[];
let settings={music:.48,sfx:.65,ambience:.38,muted:false,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,tapSweep:false,lowQuality:false};
try{Object.assign(settings,JSON.parse(localStorage.getItem('dustlings.settings')||'{}'));}catch{}
state.reducedMotion=settings.reducedMotion;audio.setMix(settings);
function saveSettings(){try{localStorage.setItem('dustlings.settings',JSON.stringify(settings));}catch{}audio.setMix(settings);}
function resize(){const r=canvas.getBoundingClientRect();renderer.resize(r.width,r.height,Math.min(settings.lowQuality?1:2,devicePixelRatio||1));renderer.setCamera?.(zoom,camera.x,camera.y);}
new ResizeObserver(resize).observe(canvas);resize();

for(const u of UPGRADES){
  const b=document.createElement('button');b.className='upgrade-card';b.id=`upgrade-${u.id}`;
  b.innerHTML=`<span class="upgrade-icon"><svg><use href="#i-${u.icon}"/></svg></span><span><strong>${u.name}</strong><span class="upgrade-description">${u.detail}</span><span class="branch-label"></span></span><span class="upgrade-cost"><span>${u.cost}</span><svg><use href="#i-dust"/></svg></span>`;
  b.title=u.effect;b.addEventListener('click',()=>{if(buyUpgrade(state,u.id)){save();updateUI();}});$('upgrades').append(b);
}
function save(){if(started)store.save(state);updateSaveStatus();}
function updateSaveStatus(){
  $('save-status').textContent=store.status==='unavailable'?'Save unavailable — export a backup':store.status==='damaged'?'Save needs recovery':'Saved on this device';
  $('settings-save-note').textContent=store.status==='unavailable'?'Browser storage is unavailable. Use Export save to keep your progress.':'Automatically saved in this browser. A backup keeps the previous checkpoint.';
}
function updateUI(){
  const percent=Math.min(100,Math.floor(state.cleaned/state.totalDust*100));
  $('crew-count').textContent=state.creatures.length;$('mote-count').textContent=state.motes;
  $('scene-caption-text').textContent=state.completed?'A little place, alive again':state.restoration>=1?'The fountain is singing':'A place waiting to bloom';
  $('progress-number').textContent=`${percent}%`;$('progress-fill').style.width=`${percent}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow',percent);
  let title='Let’s wake<br>the courtyard.',copy='Under all this dust, something lovely is waiting. Every bit you brush away can become a little helper.';
  if(state.completed){title='A little place,<br>alive again.';copy='The courtyard is yours. Stay with the fountain, watch your little crew, and enjoy what you made together.';}
  else if(state.ritual){title='Listen.<br>They’re singing.';copy='Your helpers are gathering around the fountain. Even the smallest voice has a part to play.';}
  else if(state.restoration>=1){title='The last<br>little things.';copy='Water is flowing again. Your helpers will find the remaining specks. There’s no need to chase every grain.';}
  else if(state.upgrades.bloom){title='A song for<br>the fountain.';copy=percent>=75?'There’s room for a circle now. Ring the bell and watch your little crew wake the wishing fountain.':'The crew has learned its song. Clear three quarters of the courtyard to make room for the fountain chorus.';}
  else if(state.creatures.length){title='From dust,<br>a little life.';copy='Your Dustlings are already helping. Grow your crew with each sweep, or point them toward a patch that needs care.';}
  $('chapter-title').innerHTML=title;$('chapter-copy').textContent=copy;
  let available=false;
  for(const u of UPGRADES){
    const el=$(`upgrade-${u.id}`),owned=state.upgrades[u.id],locked=u.id==='bloom'&&(!state.upgrades.brush||!state.upgrades.teamwork),afford=state.motes>=u.cost&&!locked&&!owned;
    el.disabled=owned||locked||state.motes<u.cost;el.classList.toggle('owned',owned);el.classList.toggle('affordable',afford);
    el.querySelector('.upgrade-cost').innerHTML=owned?'<svg><use href="#i-check"/></svg>':`<span>${u.cost}</span><svg><use href="#i-dust"/></svg>`;
    el.querySelector('.branch-label').textContent=owned?u.effect:locked?'After A softer sweep + Better together':afford?'Ready to discover':`${Math.max(0,u.cost-state.motes)} more motes to discover`;
    el.setAttribute('aria-label',`${u.name}. ${u.detail} ${owned?'Discovered':locked?'Requires both earlier discoveries':`${u.cost} motes. ${state.motes} available.`}`);available||=afford;
  }
  $('upgrade-dot').hidden=!available;
  const restoreReady=state.upgrades.bloom&&percent>=75&&!state.ritual&&state.restoration<1;
  $('restore-button').disabled=!restoreReady;
  $('restore-button').textContent=state.restoration>=1?'The fountain is awake ✓':state.ritual?`A little song… ${Math.round(state.restoration*100)}%`:restoreReady?'Ring the fountain bell ♫':!state.upgrades.bloom?'Clear 75% & learn the chorus':`Clear ${75-percent}% more to gather the crew`;
  $('landmark-copy').textContent=state.restoration>=1?'A little water. A little music. A new beginning.':state.ritual?'Watch the crew form a circle. The water remembers.':'A quiet fountain with a song still in it.';
  $('free-roam').hidden=!state.assignment||state.ritual||state.completed;
  $('find-dust').hidden=percent<60||state.completed;
  $('toast').hidden=state.noticeTime<=0||!state.notice;if(state.notice)$('toast').textContent=state.notice;
  const isTouch=matchMedia('(pointer:coarse)').matches;
  $('tip-text').textContent=state.completed?'Stay a while. You brought this place back to life.':state.ritual?'A chorus of little things.':state.mode==='direct'?(isTouch?'Place the flag above your finger. Lift to send the crew.':'Click an open patch to send your crew there.'):(isTouch?'Sweep with the circle just above your finger.':settings.tapSweep?'Tap for a sweep, or hold & brush at your own pace.':'Hold & sweep over the dust. See what wakes up.');
  $('sound-toggle').classList.toggle('muted',settings.muted);$('sound-toggle').setAttribute('aria-label',settings.muted?'Unmute sound':'Mute sound');
  $('sound-toggle').title=settings.muted?'Sound off · click to unmute':'Sound on · click to mute';
}
function setMode(mode){state.mode=mode;state.pointer.active=false;autoSweep=0;audio.setBrushing(false);$('brush-tool').classList.toggle('selected',mode==='brush');$('direct-tool').classList.toggle('selected',mode==='direct');$('brush-tool').setAttribute('aria-pressed',mode==='brush');$('direct-tool').setAttribute('aria-pressed',mode==='direct');updateUI();}
$('brush-tool').onclick=()=>setMode('brush');$('direct-tool').onclick=()=>setMode('direct');
$('free-roam').onclick=()=>{releaseCrew(state);updateUI();save();};
$('restore-button').onclick=()=>{if(beginRitual(state)){closeJournal();save();updateUI();}};
$('find-dust').onclick=()=>{
  const d=state.dust.filter(d=>d.amount>.0001).sort((a,b)=>b.amount-a.amount)[0];
  if(d){state.hintTarget={x:d.x,y:d.y};camera={x:d.x,y:d.y};renderer.setCamera?.(zoom,camera.x,camera.y);assignCrew(state,d.x,d.y);notify(state,'A little dust is glowing. Your crew is on its way.');closeJournal();}
};
function closeJournal(){$('journal').classList.remove('open');}
$('mobile-journal').onclick=()=>{$('journal').classList.toggle('open');};$('close-journal').onclick=closeJournal;
function stopInput(){state.pointer.active=false;state.pointer.preview=false;pointerId=null;autoSweep=0;panning=false;audio.setBrushing(false);}
function openSettings(){if(!started)return;stopInput();paused=true;audio.pause();save();$('settings').showModal();}
function closeSettings(){if(!$('settings').open)return;$('settings').close();$('restart-confirm').hidden=true;paused=false;lastTime=performance.now();audio.resume();canvas.focus({preventScroll:true});}
$('pause-button').onclick=openSettings;$('close-settings').onclick=closeSettings;$('resume-button').onclick=closeSettings;
$('settings').addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
$('welcome').addEventListener('cancel',e=>e.preventDefault());
$('completion').addEventListener('cancel',e=>{e.preventDefault();enjoy();});
async function start(){
  $('welcome').close();started=true;paused=false;lastTime=performance.now();
  try{await audio.start();audio.setMix(settings);audio.setProgress(state.restoration);}catch{notify(state,'Sound couldn’t start. You can still enjoy the courtyard.');}
  canvas.focus({preventScroll:true});save();updateUI();
}
$('start-button').onclick=start;
$('sound-toggle').onclick=async()=>{settings.muted=!settings.muted;saveSettings();if(started&&!paused){try{await audio.start();}catch{}}updateUI();};
for(const key of ['music','sfx','ambience']){
  $(`${key}-volume`).value=Math.round(settings[key]*100);$(`${key}-value`).textContent=`${Math.round(settings[key]*100)}%`;
  $(`${key}-volume`).oninput=e=>{settings[key]=Number(e.target.value)/100;$(`${key}-value`).textContent=`${e.target.value}%`;saveSettings();};
}
for(const [id,key] of [['reduced-motion','reducedMotion'],['tap-sweep','tapSweep'],['low-quality','lowQuality']]){
  $(id).checked=!!settings[key];$(id).onchange=e=>{settings[key]=e.target.checked;state.reducedMotion=settings.reducedMotion;saveSettings();resize();updateUI();};
}
function exportSave(){
  const blob=new Blob([JSON.stringify(serialise(state),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dustlings-courtyard-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('export-save').onclick=exportSave;$('completion-save').onclick=exportSave;
$('import-save').onclick=()=>$('save-file').click();
$('save-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>300000)throw Error('That file is too large to be a courtyard save.');const next=restore(JSON.parse(await file.text()));state=next;state.reducedMotion=settings.reducedMotion;completionShown=state.completed;birth=null;save();audio.setProgress(state.restoration);setMode('brush');$('settings-save-note').textContent='Your courtyard has been recovered. Ready when you are.';}catch(err){$('settings-save-note').textContent=`Could not import. ${err.message} Your current courtyard is safe.`;}e.target.value='';
};
$('restart-button').onclick=()=>$('restart-confirm').hidden=false;$('cancel-restart').onclick=()=>$('restart-confirm').hidden=true;
$('confirm-restart').onclick=()=>{store.clear();state=createState();state.reducedMotion=settings.reducedMotion;completionShown=false;birth=null;audio.setProgress(0);save();setMode('brush');closeSettings();};
function enjoy(){$('completion').close();paused=false;lastTime=performance.now();audio.resume();canvas.focus({preventScroll:true});}
$('enjoy-button').onclick=enjoy;
document.querySelector('.wordmark').onclick=e=>{e.preventDefault();openSettings();};

// Touch uses a visible brush/flag preview 42 CSS pixels above the finger.
function locate(e){
  const r=canvas.getBoundingClientRect(),touch=e.pointerType==='touch';
  const sx=e.clientX-r.left,sy=e.clientY-r.top-(touch?42:0);
  const p=renderer.screenToWorld(sx,sy);return {...p,touch,inside:true,active:state.pointer.active,preview:state.pointer.preview};
}
canvas.addEventListener('pointerdown',e=>{
  if(paused||!started||pointerId!==null)return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointerId=e.pointerId;
  lastPointer={x:e.clientX,y:e.clientY};pointerMoved=false;panning=e.button===1||e.shiftKey;
  state.pointer=locate(e);state.pointer.active=state.mode==='brush'&&!panning;
  state.pointer.preview=state.mode==='direct'&&!panning;
  if(state.pointer.active&&settings.tapSweep)autoSweep=1.35;
});
canvas.addEventListener('pointermove',e=>{
  if(paused)return;
  if(panning&&pointerId===e.pointerId&&lastPointer){
    const a=renderer.screenToWorld(lastPointer.x,lastPointer.y),b=renderer.screenToWorld(e.clientX,e.clientY);
    camera.x=Math.max(180,Math.min(820,camera.x-(b.x-a.x)));camera.y=Math.max(220,Math.min(600,camera.y-(b.y-a.y)));renderer.setCamera?.(zoom,camera.x,camera.y);
  }else{state.pointer=locate(e);}
  if(pointerId===e.pointerId){if(lastPointer&&Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)>3)pointerMoved=true;lastPointer={x:e.clientX,y:e.clientY};}
});
function pointerUp(e,cancel=false){
  if(e.pointerId!==pointerId)return;
  if(!cancel&&!panning&&state.mode==='direct'){state.pointer=locate(e);assignCrew(state,state.pointer.x,state.pointer.y);save();}
  state.pointer.active=!cancel&&!panning&&state.mode==='brush'&&settings.tapSweep&&autoSweep>0;
  state.pointer.preview=false;
  if(cancel)autoSweep=0;pointerId=null;panning=false;audio.setBrushing(false);updateUI();
}
canvas.addEventListener('pointerup',e=>pointerUp(e));canvas.addEventListener('pointercancel',e=>pointerUp(e,true));
canvas.addEventListener('lostpointercapture',e=>{if(pointerId===e.pointerId)pointerUp(e,true);});
canvas.addEventListener('pointerleave',()=>{if(pointerId===null){state.pointer.inside=false;state.pointer.active=false;audio.setBrushing(false);}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if($('journal').classList.contains('open')){e.preventDefault();closeJournal();return;}if(started&&!paused){e.preventDefault();openSettings();}return;}
  if(!started||paused||/INPUT|TEXTAREA/.test(e.target.tagName))return;
  const key=e.key.toLowerCase();
  if(key==='b')setMode('brush');if(key==='d')setMode('direct');if(key==='u')$('journal').classList.toggle('open');if(key==='r')releaseCrew(state);
  if(key==='+'||key==='=')setZoom(Math.min(2,zoom+.25));if(key==='-')setZoom(Math.max(1,zoom-.25));
  if(e.key.startsWith('Arrow')){e.preventDefault();camera.x+=e.key==='ArrowRight'?55:e.key==='ArrowLeft'?-55:0;camera.y+=e.key==='ArrowDown'?55:e.key==='ArrowUp'?-55:0;camera.x=Math.max(180,Math.min(820,camera.x));camera.y=Math.max(200,Math.min(610,camera.y));renderer.setCamera?.(zoom,camera.x,camera.y);}
});
function setZoom(value){zoom=value;if(zoom===1)camera={x:500,y:390};renderer.setCamera?.(zoom,camera.x,camera.y);$('zoom-in').disabled=zoom>=2;$('zoom-out').disabled=zoom<=1;}
const cameraControls=document.createElement('div');cameraControls.className='camera-controls';cameraControls.innerHTML='<button id="zoom-out" aria-label="Zoom out" title="Zoom out · −" disabled>−</button><button id="zoom-in" aria-label="Zoom in" title="Zoom in · +">+</button><button id="pan-toggle" aria-label="Pan courtyard" aria-pressed="false" title="Pan courtyard">↔</button>';
document.querySelector('.world-panel').append(cameraControls);
let panMode=false;$('zoom-in').onclick=()=>setZoom(Math.min(2,zoom+(canvas.clientWidth<500?.7:.25)));$('zoom-out').onclick=()=>setZoom(Math.max(1,zoom-(canvas.clientWidth<500?.7:.25)));$('pan-toggle').onclick=()=>{panMode=!panMode;$('pan-toggle').setAttribute('aria-pressed',panMode);$('pan-toggle').classList.toggle('selected',panMode);notify(state,panMode?'Drag the courtyard to look around. Tap ↔ again to brush.':'Ready to brush again.');};
canvas.addEventListener('pointerdown',e=>{if(panMode&&!paused){panning=true;state.pointer.active=false;autoSweep=0;}},false);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){stopInput();save();if(!paused){paused=true;audio.pause();$('settings').showModal();}}});
window.addEventListener('pagehide',()=>{stopInput();save();});window.addEventListener('blur',()=>{stopInput();});

function processEvents(){
  for(const e of state.events.splice(0)){
    if(['birth','assign','blocked','upgrade','landmark','complete'].includes(e.name))audio.event(e.name);
    if(e.name==='birth'&&e.first){birth={x:e.x,y:e.y};birthUntil=state.elapsed+6;}
    if(e.name==='upgradeAvailable')notify(state,'A new discovery is ready. Choose how you’d like to help your crew grow.');
    if(e.name==='fountainRestored')audio.event('complete',.6);
    if(e.name==='complete')save();
  }
}
function frame(now){
  const raw=(now-lastTime)/1000;lastTime=now;
  if(started&&!paused){
    const dt=Math.min(.05,raw);tick(state,dt);
    if(autoSweep>0){autoSweep-=dt;if(autoSweep<=0&&pointerId===null)state.pointer.active=false;}
    processEvents();audio.setProgress(state.restoration);
    const brushHasDust=state.pointer.active&&state.mode==='brush'&&state.dust.some(d=>d.amount>.001&&Math.hypot(d.x-state.pointer.x,d.y-state.pointer.y)<state.brushRadius);
    audio.setBrushing(brushHasDust,settings.tapSweep?.6:.8);
    if(now-lastSave>5000){save();lastSave=now;}
    if(state.completed&&!completionShown&&state.celebration<4){completionShown=true;paused=true;stopInput();$('finish-crew').textContent=state.creatures.length;$('completion').showModal();}
    // Keep every foreground frame, including stalls, so performance evidence is honest.
    frames.push(raw*1000);if(frames.length>3600)frames.shift();
  }
  renderer.render(state,state.elapsed);
  if(birth&&state.elapsed<birthUntil&&!paused){const p=renderer.worldToScreen(birth.x,birth.y);$('birth-label').hidden=false;$('birth-label').style.left=`${Math.max(110,Math.min(canvas.clientWidth-110,p.x))}px`;$('birth-label').style.top=`${p.y-33}px`;}else $('birth-label').hidden=true;
  if(now-lastUI>150){updateUI();lastUI=now;}
  requestAnimationFrame(frame);
}
if(state.elapsed>0)$('start-button').innerHTML='Return to your courtyard <span>↗</span>';
if(store.recovered||store.status==='damaged'||store.status==='unavailable'){$('recovery-note').hidden=false;$('recovery-note').textContent=store.recovered?'Your previous save was recovered from its backup.':store.status==='damaged'?'The saved courtyard could not be read. You can import a backup from Settings after starting.':'Browser saving is unavailable. Export a save from Settings before leaving.';}
updateUI();updateSaveStatus();$('welcome').showModal();requestAnimationFrame(frame);

// Local QA hooks exist only in an explicitly requested test URL. Never used as player evidence.
if(new URLSearchParams(location.search).has('qa'))window.__dustlings={
  get state(){return state;},renderer,audio,serialise:()=>serialise(state),
  advance(seconds){const n=Math.ceil(seconds/.05);for(let i=0;i<n;i++)tick(state,.05);processEvents();updateUI();},
  load(data){state=restore(data);completionShown=state.completed;state.reducedMotion=settings.reducedMotion;updateUI();},
  getPerformance(){const sorted=[...frames].sort((a,b)=>a-b);return {samples:frames.length,meanMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95Ms:sorted[Math.floor(sorted.length*.95)],p99Ms:sorted[Math.floor(sorted.length*.99)],worstMs:sorted.at(-1),over33ms:frames.filter(n=>n>33.4).length,over500ms:frames.filter(n=>n>=500).length,creatures:state.creatures.length,dpr:devicePixelRatio,canvas:{width:canvas.clientWidth,height:canvas.clientHeight},audio:audio.getDiagnostics?.()};},
  resetPerformance(){frames.length=0;},pause(value){paused=value;},beginRitual:()=>beginRitual(state),setZoom,save,
};
