import {createState,tick,buyUpgrade,assignCrew,releaseCrew,beginRitual,UPGRADES,serialise,restore,walkable,notify} from './game.js';
import {SaveStore,SAVE_KEY,INTERRUPTED_KEY} from './storage.js';
import {Renderer} from './renderer.js';
import {DustAudio} from './audio.js';
import {createKeyboardControls} from './keyboard.js';
import {normaliseSettings} from './settings.js';
import {DISCOVERIES,previewMarkup,markPurchased,applyMotionPreference} from './ui.js';

const $=id=>document.getElementById(id);
let browserStorage;
try{browserStorage=window.localStorage;}catch{browserStorage={getItem(){throw Error('Storage unavailable');},setItem(){throw Error('Storage unavailable');},removeItem(){throw Error('Storage unavailable');}};}
const store=new SaveStore(browserStorage);
let state=store.load()||createState();
const canvas=$('world'),renderer=new Renderer(canvas),audio=new DustAudio();
let started=false,paused=true,lastTime=performance.now(),lastSave=0,lastUI=0,autoSweep=0,birth=null,birthUntil=0,completionShown=state.completed,sceneDirty=true;
let zoom=1,camera={x:500,y:390},lastPointer=null,pointerId=null,panning=false,pointerMoved=false,viewportMode=null;
const frames=[];
const htmlValues=new WeakMap();
function text(el,value){value=String(value);if(el.textContent!==value)el.textContent=value;}
function html(el,value){if(htmlValues.get(el)!==value){el.innerHTML=value;htmlValues.set(el,value);}}
function attr(el,key,value){value=String(value);if(el.getAttribute(key)!==value)el.setAttribute(key,value);}
function panCamera(dx,dy){camera.x=Math.max(180,Math.min(820,camera.x+dx));camera.y=Math.max(200,Math.min(610,camera.y+dy));renderer.setCamera(zoom,camera.x,camera.y);}
const keyboard=createKeyboardControls({canvas,getState:()=>state,renderer,onMode:setMode,onAssign:(x,y)=>{assignCrew(state,x,y);save();updateUI();},onPan:panCamera,onNotice:message=>notify(state,message),onChange:updateUI});
let settings=normaliseSettings(null,matchMedia('(prefers-reduced-motion: reduce)').matches);
try{settings=normaliseSettings(JSON.parse(localStorage.getItem('dustlings.settings')||'null'),settings.reducedMotion);}catch{}
state.reducedMotion=settings.reducedMotion;audio.setMix(settings);applyMotionPreference(settings);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>applyMotionPreference(settings));
function uiSound(kind){audio.ui?.(kind)?.catch(()=>{});}
function saveSettings(){try{localStorage.setItem('dustlings.settings',JSON.stringify(settings));}catch{}audio.setMix(settings);}
function resize(){
  if(started)stopInput();
  const r=canvas.getBoundingClientRect();renderer.resize(r.width,r.height,Math.min(settings.lowQuality?1:2,devicePixelRatio||1));
  if(viewportMode!==renderer.viewportMode){viewportMode=renderer.viewportMode;zoom=renderer.recommendedZoom;camera={x:500,y:390};}
  renderer.setCamera(zoom,camera.x,camera.y);if($('zoom-out')){$('zoom-out').disabled=zoom<=1;$('zoom-in').disabled=zoom>=2;}sceneDirty=true;
}
new ResizeObserver(resize).observe(canvas);resize();

for(const u of UPGRADES){
  const b=document.createElement('button');b.className='upgrade-card';b.id=`upgrade-${u.id}`;
  b.innerHTML=`<span class="upgrade-icon"><svg><use href="#i-${u.icon}"/></svg></span><span><strong>${u.name}</strong><span class="upgrade-description">${u.detail}</span><span class="branch-label"></span></span><span class="upgrade-cost"><span>${u.cost}</span><svg><use href="#i-dust"/></svg></span>${previewMarkup(u.id)}`;
  b.title=u.effect;b.addEventListener('click',()=>{if(buyUpgrade(state,u.id)){save();updateUI();markPurchased(b);if(document.activeElement===b)$('close-journal').focus({preventScroll:true});}});$('upgrades').append(b);
}
// Web Locks serialize writers across tabs. The store also compares its last read
// revision, so a stale window never silently replaces a newer checkpoint.
function withSaveLock(action){return navigator.locks?.request?navigator.locks.request(SAVE_KEY,action):Promise.resolve().then(action);}
function showSaveConflict(){
  if(!started)return;
  stopInput();paused=true;audio.pause();
  if($('completion').open)$('completion').close();
  if(!$('settings').open)$('settings').showModal();
  updateSaveStatus();
}
async function save(){
  let success=false;
  try{if(started)success=await withSaveLock(()=>store.save(state));}catch{store.status='unavailable';}
  updateSaveStatus();if(store.status==='conflict')showSaveConflict();return success;
}
function checkpoint(){if(started){store.checkpoint(state);updateSaveStatus();}}
function updateSaveStatus(){
  $('save-status').textContent=!started&&store.status==='ready'?'Progress saves here':store.status==='conflict'?'Newer progress in another window':store.status==='unavailable'?'Save unavailable — export a backup':store.status==='damaged'?'Save needs recovery':'Saved on this device';
  $('settings-save-note').textContent=store.status==='conflict'?'Your progress is still in this window. Export it before loading the saved courtyard if you want to keep both.':store.status==='unavailable'?'Browser storage is unavailable. Use Export save to keep your progress.':'Automatically saved on this device. A backup keeps the previous checkpoint.';
  document.querySelector('.welcome-note').textContent=store.status==='unavailable'?'You can play. Export a save before leaving this device.':'Take your time. Your progress stays with you.';
  $('save-conflict').hidden=store.status!=='conflict';
}
function updateUI(){
  sceneDirty=true;
  const percent=Math.min(100,Math.floor(state.cleaned/state.totalDust*100));
  text($('crew-count'),state.creatures.length);text($('crew-label'),state.creatures.length===1?'helper':'helpers');text($('mote-count'),state.motes);text($('hud-progress'),`${percent}%`);
  text($('scene-caption-text'),state.completed?'A little place, alive again':state.restoration>=1?'The fountain is singing':'A place waiting to bloom');
  text($('progress-number'),`${percent}%`);if($('progress-fill').style.width!==`${percent}%`)$('progress-fill').style.width=`${percent}%`;
  attr(document.querySelector('.progress-track'),'aria-valuenow',percent);
  let available=false;
  for(const u of UPGRADES){
    const el=$(`upgrade-${u.id}`),owned=state.upgrades[u.id],locked=u.id==='bloom'&&(!state.upgrades.brush||!state.upgrades.teamwork),afford=state.motes>=u.cost&&!locked&&!owned;
    const disabled=owned||locked||state.motes<u.cost;if(el.disabled!==disabled)el.disabled=disabled;el.classList.toggle('owned',owned);el.classList.toggle('affordable',afford);el.classList.toggle('locked',locked);if(!owned)el.classList.remove('just-purchased');
    html(el.querySelector('.upgrade-cost'),owned?'<svg><use href="#i-check"/></svg>':`<span>${u.cost}</span><svg><use href="#i-dust"/></svg>`);
    text(el.querySelector('.branch-label'),owned?DISCOVERIES[u.id].label:locked?'After both earlier discoveries':afford?'Choose this discovery':`${Math.max(0,u.cost-state.motes)} more motes to discover`);
    attr(el,'aria-label',`${u.name}. ${u.detail} ${owned?'Discovered':locked?'Requires both earlier discoveries':`${u.cost} motes. ${state.motes} available.`}`);available||=afford;
  }
  $('upgrade-dot').hidden=!available;const grow=$('mobile-journal');grow.setAttribute('aria-label',available?'Grow: a discovery is ready':'Grow: discoveries and fountain');
  const restoreReady=state.upgrades.bloom&&percent>=75&&!state.ritual&&state.restoration<1;
  $('restore-button').disabled=!restoreReady;
  text($('restore-button'),state.restoration>=1?'Fountain restored ✓':state.ritual?`The chorus… ${Math.round(state.restoration*100)}%`:restoreReady?'Ring the fountain bell ♫':!state.upgrades.bloom?'Learn the fountain chorus':`Clear ${75-percent}% more`);
  if(restoreReady){$('upgrade-dot').hidden=false;grow.setAttribute('aria-label','Grow: the fountain is ready');}
  text($('landmark-copy'),state.restoration>=1?'A little water. A little music. A new beginning.':state.ritual?'Watch the crew form a circle. The water remembers.':'A quiet fountain with a song still in it.');
  $('free-roam').hidden=!state.assignment||state.ritual||state.completed;
  $('find-dust').hidden=percent<60||state.completed;
  $('toast').hidden=state.noticeTime<=0||!state.notice;if(state.notice)text($('toast'),state.notice);
  const isTouch=matchMedia('(pointer:coarse)').matches;
  text($('tip-text'),panMode?'Drag to look around. Choose a tool to return.':state.completed?'Stay a while. You brought this place back to life.':state.ritual?'A chorus of little things.':state.pointer.keyboard?(state.mode==='direct'?'Arrows aim · Enter sends crew · N finds dust':'Arrows aim · Space starts/stops brushing · N finds dust'):state.mode==='direct'?(isTouch?'Place the flag above your finger. Lift to send the crew.':'Click an open patch to send your crew there.'):(isTouch?'Sweep with the circle just above your finger.':settings.tapSweep?'Tap for a sweep, or hold & brush at your own pace.':'Hold & sweep over the dust. See what wakes up.'));
  $('sound-toggle').classList.toggle('muted',settings.muted);$('sound-toggle').querySelector('use').setAttribute('href',settings.muted?'#i-sound-off':'#i-sound');$('sound-toggle').setAttribute('aria-pressed',String(!settings.muted));$('sound-toggle').setAttribute('aria-label',settings.muted?'Unmute sound':'Mute sound');
  $('sound-toggle').title=settings.muted?'Sound off · click to unmute':'Sound on · click to mute';
}
function setMode(mode){const changed=state.mode!==mode||panMode;keyboard.stop();panMode=false;$('pan-toggle').setAttribute('aria-pressed','false');$('pan-toggle').classList.remove('selected');state.mode=mode;state.pointer.active=false;state.pointer.preview=false;autoSweep=0;audio.setBrushing(false);$('brush-tool').classList.toggle('selected',mode==='brush');$('direct-tool').classList.toggle('selected',mode==='direct');$('brush-tool').setAttribute('aria-pressed',mode==='brush');$('direct-tool').setAttribute('aria-pressed',mode==='direct');updateUI();if(changed)uiSound('select');}
$('brush-tool').onclick=()=>setMode('brush');$('direct-tool').onclick=()=>setMode('direct');
$('free-roam').onclick=()=>{releaseCrew(state);updateUI();save();uiSound('select');};
$('restore-button').onclick=()=>{if(beginRitual(state)){closeJournal();save();updateUI();}};
$('find-dust').onclick=()=>{
  const d=state.dust.filter(d=>d.amount>.0001).sort((a,b)=>b.amount-a.amount)[0];
  if(d){state.hintTarget={x:d.x,y:d.y};camera={x:d.x,y:d.y};renderer.setCamera?.(zoom,camera.x,camera.y);assignCrew(state,d.x,d.y);notify(state,'A little dust is glowing. Your crew is on its way.');closeJournal();}
};
function closeJournal(){const open=$('journal').classList.contains('open');$('journal').classList.remove('open');$('mobile-journal').setAttribute('aria-expanded','false');if(open){$('mobile-journal').focus({preventScroll:true});uiSound('close');}}
function toggleJournal(){if($('journal').classList.contains('open')){closeJournal();return;}keyboard.stop();$('journal').classList.add('open');$('mobile-journal').setAttribute('aria-expanded','true');$('close-journal').focus({preventScroll:true});uiSound('open');}
$('mobile-journal').onclick=toggleJournal;$('close-journal').onclick=closeJournal;
function stopInput(){
  const captured=pointerId;keyboard.stop();state.pointer.active=false;state.pointer.preview=false;state.pointer.inside=false;
  pointerId=null;lastPointer=null;autoSweep=0;panning=false;audio.setBrushing(false);sceneDirty=true;
  if(captured!==null&&canvas.hasPointerCapture(captured))canvas.releasePointerCapture(captured);
}
function openSettings(event){if(!started)return;stopInput();paused=true;audio.pause();save();$('settings').showModal();if(event?.isTrusted!==false)uiSound('open');}
function closeSettings(){if(!$('settings').open)return;if(store.status==='conflict'){$('load-latest-save').focus();return;}$('settings').close();$('restart-confirm').hidden=true;paused=false;lastTime=performance.now();audio.resume();canvas.focus({preventScroll:true});uiSound('close');}
$('pause-button').onclick=openSettings;$('close-settings').onclick=closeSettings;$('resume-button').onclick=closeSettings;
$('settings').addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
$('welcome').addEventListener('cancel',e=>e.preventDefault());
$('completion').addEventListener('cancel',e=>{e.preventDefault();enjoy();});
async function start(){
  $('welcome').close();started=true;paused=false;lastTime=performance.now();
  try{await audio.start();audio.setMix(settings);audio.setProgress(state.restoration);}catch{notify(state,'Sound couldn’t start. You can still enjoy the courtyard.');}
  canvas.focus({preventScroll:true});save();updateUI();uiSound('open');
}
$('start-button').onclick=start;
$('sound-toggle').onclick=async()=>{settings.muted=!settings.muted;saveSettings();if(started&&!paused){try{await audio.start();}catch{}}updateUI();uiSound('change');};
for(const key of ['music','sfx','ambience']){
  $(`${key}-volume`).value=Math.round(settings[key]*100);$(`${key}-volume`).style.setProperty('--level',`${Math.round(settings[key]*100)}%`);$(`${key}-value`).textContent=`${Math.round(settings[key]*100)}%`;
  $(`${key}-volume`).oninput=e=>{settings[key]=Number(e.target.value)/100;e.target.style.setProperty('--level',`${e.target.value}%`);$(`${key}-value`).textContent=`${e.target.value}%`;saveSettings();};
  $(`${key}-volume`).onchange=()=>uiSound('change');
}
for(const [id,key] of [['reduced-motion','reducedMotion'],['tap-sweep','tapSweep'],['low-quality','lowQuality']]){
  $(id).checked=!!settings[key];$(id).onchange=e=>{settings[key]=e.target.checked;state.reducedMotion=settings.reducedMotion;saveSettings();applyMotionPreference(settings);resize();updateUI();uiSound('change');};
}
function exportSave(){
  const blob=new Blob([JSON.stringify(serialise(state),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dustlings-courtyard-save.json';a.click();uiSound('open');setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('export-save').onclick=exportSave;$('completion-save').onclick=exportSave;
$('import-save').onclick=()=>{$('save-file').click();uiSound('open');};
$('save-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>300000)throw Error('That file is too large to be a courtyard save.');const next=restore(JSON.parse(await file.text()));if(store.hasConflict()){showSaveConflict();e.target.value='';return;}state=next;state.reducedMotion=settings.reducedMotion;completionShown=state.completed;birth=null;const saved=await save();audio.setProgress(state.restoration);setMode('brush');if(saved){$('settings-save-note').textContent='Your courtyard has been recovered. Ready when you are.';uiSound('confirm');}}catch(err){$('settings-save-note').textContent=`Could not import. ${err.message} Your current courtyard is safe.`;}e.target.value='';
};
$('restart-button').onclick=()=>{$('restart-confirm').hidden=false;uiSound('open');};$('cancel-restart').onclick=()=>{$('restart-confirm').hidden=true;uiSound('close');};
$('confirm-restart').onclick=async()=>{
  const reset=await withSaveLock(()=>{if(!store.clear())return false;state=createState();state.reducedMotion=settings.reducedMotion;completionShown=false;birth=null;return store.save(state);});
  if(!reset){updateSaveStatus();if(store.status==='conflict')showSaveConflict();return;}
  audio.setProgress(0);setMode('brush');updateSaveStatus();closeSettings();
};
$('load-latest-save').onclick=async()=>{
  await withSaveLock(()=>{const latest=store.load();if(!latest&&store.status!=='ready')return;state=latest||createState();state.reducedMotion=settings.reducedMotion;completionShown=state.completed;birth=null;store.save(state);});
  updateSaveStatus();if(store.status==='saved'||store.status==='recovered'||store.status==='ready'){audio.setProgress(state.restoration);setMode('brush');closeSettings();}
};
window.addEventListener('storage',e=>{if((e.key===SAVE_KEY||e.key===INTERRUPTED_KEY)&&store.hasConflict())showSaveConflict();});
function enjoy(){$('completion').close();paused=false;lastTime=performance.now();audio.resume();canvas.focus({preventScroll:true});uiSound('close');}
$('enjoy-button').onclick=enjoy;
document.querySelector('.wordmark').onclick=e=>{e.preventDefault();openSettings();};

// Touch uses a visible brush/flag preview 42 CSS pixels above the finger.
function locate(e){
  const r=canvas.getBoundingClientRect(),touch=e.pointerType==='touch';
  const sx=e.clientX-r.left,sy=e.clientY-r.top-(touch?42:0);
  const p=renderer.screenToWorld(sx,sy);return {...p,touch,inside:renderer.containsScreenPoint(sx,sy),active:state.pointer.active,preview:state.pointer.preview};
}
canvas.addEventListener('pointerdown',e=>{
  if(paused||!started||pointerId!==null)return;const target=locate(e);if(!target.inside)return;e.preventDefault();keyboard.stop();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointerId=e.pointerId;
  lastPointer={x:e.clientX,y:e.clientY};pointerMoved=false;panning=e.button===1||e.shiftKey;
  state.pointer=locate(e);state.pointer.active=state.mode==='brush'&&!panning;
  state.pointer.preview=state.mode==='direct'&&!panning;
  if(state.pointer.active&&settings.tapSweep)autoSweep=1.35;
});
canvas.addEventListener('pointermove',e=>{
  if(paused||(pointerId!==null&&pointerId!==e.pointerId))return;
  if(panning&&pointerId===e.pointerId&&lastPointer){
    const a=renderer.screenToWorld(lastPointer.x,lastPointer.y),b=renderer.screenToWorld(e.clientX,e.clientY);
    camera.x=Math.max(180,Math.min(820,camera.x-(b.x-a.x)));camera.y=Math.max(220,Math.min(600,camera.y-(b.y-a.y)));renderer.setCamera?.(zoom,camera.x,camera.y);
  }else{const target=locate(e);if(!target.inside){target.active=false;target.preview=false;}else if(pointerId===e.pointerId){target.active=state.mode==='brush';target.preview=state.mode==='direct';}state.pointer=target;}
  if(pointerId===e.pointerId){if(lastPointer&&Math.hypot(e.clientX-lastPointer.x,e.clientY-lastPointer.y)>3)pointerMoved=true;lastPointer={x:e.clientX,y:e.clientY};}
});
function pointerUp(e,cancel=false){
  if(e.pointerId!==pointerId)return;
  const target=locate(e);
  if(!cancel&&!panning&&state.mode==='direct'&&target.inside){state.pointer=target;assignCrew(state,state.pointer.x,state.pointer.y);save();}
  state.pointer.active=!cancel&&!panning&&target.inside&&state.mode==='brush'&&settings.tapSweep&&autoSweep>0;
  state.pointer.preview=false;
  if(cancel)autoSweep=0;pointerId=null;panning=false;audio.setBrushing(false);updateUI();
}
canvas.addEventListener('pointerup',e=>pointerUp(e));canvas.addEventListener('pointercancel',e=>pointerUp(e,true));
canvas.addEventListener('lostpointercapture',e=>{if(pointerId===e.pointerId)pointerUp(e,true);});
canvas.addEventListener('pointerleave',()=>{
  // Touch emits leave immediately after a normal lift. Preserve the intentional
  // timed sweep; cancellation, focus loss, pause and tool changes still stop it.
  if(pointerId===null&&!(settings.tapSweep&&autoSweep>0&&state.pointer.active)){
    state.pointer.inside=false;state.pointer.active=false;audio.setBrushing(false);
  }
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if($('journal').classList.contains('open')){e.preventDefault();closeJournal();return;}if(started&&!paused){e.preventDefault();openSettings();}return;}
  if(!started||paused||/INPUT|TEXTAREA/.test(e.target.tagName))return;
  if($('journal').classList.contains('open'))return;
  if(panMode&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)){stopInput();return;}
  if(keyboard.handleKeyDown(e)){e.preventDefault();return;}
  const key=e.key.toLowerCase();
  if($('journal').classList.contains('open'))return;
  if(key==='b')setMode('brush');if(key==='d')setMode('direct');if(key==='u')toggleJournal();if(key==='r')releaseCrew(state);
  if(key==='+'||key==='=')setZoom(Math.min(2,zoom+.25));if(key==='-')setZoom(Math.max(1,zoom-.25));
});
document.addEventListener('keyup',e=>{if(keyboard.handleKeyUp(e))e.preventDefault();});
canvas.addEventListener('blur',()=>keyboard.stop());
function setZoom(value){const changed=zoom!==value;zoom=value;if(zoom===1)camera={x:500,y:390};renderer.setCamera?.(zoom,camera.x,camera.y);sceneDirty=true;$('zoom-in').disabled=zoom>=2;$('zoom-out').disabled=zoom<=1;if(changed)uiSound('select');}
const cameraControls=document.createElement('div');cameraControls.className='camera-controls';cameraControls.innerHTML='<button id="zoom-out" aria-label="Zoom out" title="Zoom out · −" disabled>−</button><button id="zoom-in" aria-label="Zoom in" title="Zoom in · +">+</button><button id="pan-toggle" aria-label="Pan courtyard" aria-pressed="false" title="Pan courtyard">↔</button>';
document.querySelector('.world-panel').append(cameraControls);
setZoom(zoom);
let panMode=false;$('zoom-in').onclick=()=>setZoom(Math.min(2,zoom+(canvas.clientWidth<500?.7:.25)));$('zoom-out').onclick=()=>setZoom(Math.max(1,zoom-(canvas.clientWidth<500?.7:.25)));$('pan-toggle').onclick=()=>{panMode=!panMode;$('pan-toggle').setAttribute('aria-pressed',panMode);$('pan-toggle').classList.toggle('selected',panMode);stopInput();$('brush-tool').classList.toggle('selected',!panMode&&state.mode==='brush');$('direct-tool').classList.toggle('selected',!panMode&&state.mode==='direct');$('brush-tool').setAttribute('aria-pressed',String(!panMode&&state.mode==='brush'));$('direct-tool').setAttribute('aria-pressed',String(!panMode&&state.mode==='direct'));notify(state,panMode?'Drag to look around. Choose Brush or Direct crew to return.':state.mode==='direct'?'Ready to direct your crew.':'Ready to brush again.');updateUI();uiSound('select');};
canvas.addEventListener('pointerdown',e=>{if(panMode&&!paused&&pointerId===e.pointerId){panning=true;state.pointer.active=false;autoSweep=0;}},false);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&started){stopInput();audio.pause();checkpoint();save();if(!paused){paused=true;$('settings').showModal();}}});
window.addEventListener('pagehide',()=>{stopInput();checkpoint();save();});window.addEventListener('blur',()=>{stopInput();});

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
    const dt=Math.min(.05,raw);keyboard.update(dt);tick(state,dt);
    if(autoSweep>0){autoSweep-=dt;if(autoSweep<=0&&pointerId===null)state.pointer.active=false;}
    processEvents();audio.setProgress(state.restoration);
    const brushHasDust=state.pointer.active&&state.mode==='brush'&&state.dust.some(d=>d.amount>.001&&Math.hypot(d.x-state.pointer.x,d.y-state.pointer.y)<state.brushRadius);
    audio.setBrushing(brushHasDust,settings.tapSweep?.6:.8);
    if(now-lastSave>5000){save();lastSave=now;}
    if(state.completed&&!completionShown&&state.celebration<4){completionShown=true;paused=true;stopInput();$('finish-crew').textContent=state.creatures.length;$('completion').showModal();}
    // Keep every foreground frame, including stalls, so performance evidence is honest.
    frames.push(raw*1000);if(frames.length>3600)frames.shift();
  }
  if(!paused||sceneDirty){renderer.render(state,state.elapsed);sceneDirty=false;}
  if(birth&&state.elapsed<birthUntil&&!paused){const p=renderer.worldToScreen(birth.x,birth.y),v=renderer.viewport;$('birth-label').hidden=false;$('birth-label').style.left=`${Math.max(v.x+100,Math.min(v.x+v.width-100,p.x))}px`;$('birth-label').style.top=`${Math.max(v.y+55,Math.min(v.y+v.height-12,p.y-33))}px`;}else $('birth-label').hidden=true;
  if(!paused&&now-lastUI>150){updateUI();lastUI=now;}
  requestAnimationFrame(frame);
}
if(state.elapsed>0)$('start-button').innerHTML='Return to your courtyard <span>↗</span>';
if(store.recovered||store.status==='damaged'||store.status==='unavailable'){$('recovery-note').hidden=false;$('recovery-note').textContent=store.recovered?(store.recoverySource==='interrupted'?'Your last sweep was recovered after an interruption.':'Your previous save was recovered from its backup.'):store.status==='damaged'?'The saved courtyard could not be read. You can import a backup from Settings after starting.':'Browser saving is unavailable. Export a save from Settings before leaving.';}
updateUI();updateSaveStatus();$('welcome').showModal();requestAnimationFrame(frame);
// Native audio setup is costly on the measured MacBook. Do it only after the
// welcome has painted; sources and music still begin from the Start gesture.
requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const prepare=()=>{if(!started&&!document.hidden){try{audio.prepare();}catch{}}};
  if('requestIdleCallback' in window)requestIdleCallback(prepare,{timeout:1500});else setTimeout(prepare,100);
}));

// Local QA hooks exist only in an explicitly requested test URL. Never used as player evidence.
if(new URLSearchParams(location.search).has('qa'))window.__dustlings={
  get state(){return state;},renderer,audio,serialise:()=>serialise(state),
  advance(seconds){const n=Math.ceil(seconds/.05);for(let i=0;i<n;i++)tick(state,.05);processEvents();updateUI();},
  load(data){state=restore(data);completionShown=state.completed;state.reducedMotion=settings.reducedMotion;updateUI();},
  getPerformance(){const sorted=[...frames].sort((a,b)=>a-b);return {samples:frames.length,meanMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95Ms:sorted[Math.floor(sorted.length*.95)],p99Ms:sorted[Math.floor(sorted.length*.99)],worstMs:sorted.at(-1),over33ms:frames.filter(n=>n>33.4).length,over500ms:frames.filter(n=>n>=500).length,creatures:state.creatures.length,dpr:devicePixelRatio,canvas:{width:canvas.clientWidth,height:canvas.clientHeight},audio:audio.getDiagnostics?.()};},
  resetPerformance(){frames.length=0;},pause(value){paused=value;sceneDirty=true;},beginRitual:()=>beginRitual(state),setZoom,save,
};
