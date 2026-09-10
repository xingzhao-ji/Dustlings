// Pure deterministic simulation. No browser or rendering dependencies.
export const SAVE_VERSION = 1;
export const FOUNTAIN = {x:500,y:370,r:83};
export const UPGRADES = [
  {id:'brush', name:'A softer sweep', cost:32, icon:'brush', detail:'A wider brush. More dust with every gentle stroke.', effect:'Brush width +45% · brushing +35%'},
  {id:'teamwork', name:'Better together', cost:32, icon:'pair', detail:'Dustlings work in little pairs, tidying almost twice as fast.', effect:'Paired cleaning · crew work +75%'},
  {id:'bloom', name:'The fountain chorus', cost:58, icon:'bell', detail:'Gather your crew in a circle to bring the old fountain to life.', effect:'Unlocks a shared restoration ritual'},
];
export function random(seed=71){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function walkable(x,y,margin=0){return x>=110+margin&&x<=890-margin&&y>=155+margin&&y<=660-margin&&Math.hypot(x-500,y-370)>=FOUNTAIN.r+margin;}
export function makeDust(){
  const rng=random(617);const dust=[];
  for(let y=166;y<=650;y+=26)for(let x=123;x<=880;x+=29){
    const px=x+(rng()-.5)*13,py=y+(rng()-.5)*12;
    if(walkable(px,py,8))dust.push({id:dust.length,x:px,y:py,amount:1,initial:1,kind:Math.floor(rng()*3)});
  }
  return dust;
}
export function createState(){
  const dust=makeDust();
  return {version:SAVE_VERSION,dust,totalDust:dust.length,cleaned:0,motes:0,earned:0,creatures:[],particles:[],elapsed:0,restoration:0,completed:false,celebration:0,upgrades:{brush:false,teamwork:false,bloom:false},assignment:null,assignmentPulse:0,mode:'brush',pointer:{x:270,y:505,active:false,inside:false,touch:false},brushRadius:44,reducedMotion:false,hintTarget:{x:270,y:505},ritual:false,ritualTime:0,events:[],firstUpgradeAt:null,firstHelperAt:null,completedAt:null,stats:{brushed:0,assisted:0,assignments:0,upgrades:[]},notice:null,noticeTime:0,findDust:false};
}
function event(s,name,data={}){s.events.push({name,...data});}
function burst(s,x,y,color,count=9){
  if(s.reducedMotion)return;
  for(let i=0;i<count;i++){const a=i/count*Math.PI*2;s.particles.push({x,y,vx:Math.cos(a)*23,vy:Math.sin(a)*20-13,life:.7,maxLife:.7,color,size:2+(i%3)});}
  if(s.particles.length>100)s.particles.splice(0,s.particles.length-100);
}
export function notify(s,text){s.notice=text;s.noticeTime=5;}
function collect(s,node,n,source){
  const before=s.cleaned;const removed=Math.min(node.amount,n);
  node.amount=Math.max(0,node.amount-removed);s.cleaned+=removed;
  s.stats[source==='brush'?'brushed':'assisted']+=removed;
  const fresh=Math.floor(s.cleaned+.000001)-s.earned;
  if(fresh>0){s.earned+=fresh;s.motes+=fresh;}
  const shouldHave=Math.min(50,Math.floor((s.cleaned+.00001)/7));
  while(s.creatures.length<shouldHave){
    const id=s.creatures.length;const angle=id*2.4;let x=node.x+Math.cos(angle)*9,y=node.y+Math.sin(angle)*9;
    if(!walkable(x,y)){x=node.x;y=node.y;}
    s.creatures.push({id,x,y,tx:x,ty:y,phase:id*2.399,born:s.elapsed,dir:0,work:0,target:null});
    burst(s,x,y,'#ead9a6',13);event(s,'birth',{x,y,first:id===0});
    if(id===0){s.firstHelperAt=s.elapsed;s.hintTarget=null;notify(s,'That dust is alive! Your first Dustling is here to help.');}
    if(id===3)notify(s,'A little crew, all from the dust. Try “Direct crew” to show them where to help.');
  }
  if(before<32&&s.cleaned>=32)event(s,'upgradeAvailable');
  if(node.amount===0&&removed>0&&source==='brush')burst(s,node.x,node.y,'#c9b48c',2);
}
export function buyUpgrade(s,id){
  const u=UPGRADES.find(x=>x.id===id);
  if(!u||s.upgrades[id]||s.motes<u.cost)return false;
  if(id==='bloom'&&(!s.upgrades.brush||!s.upgrades.teamwork))return false;
  s.motes-=u.cost;s.upgrades[id]=true;s.brushRadius=s.upgrades.brush?64:44;
  if(s.firstUpgradeAt===null)s.firstUpgradeAt=s.elapsed;
  s.stats.upgrades.push({id,at:s.elapsed});event(s,'upgrade',{id});
  notify(s,id==='brush'?'A softer sweep. Your brush now reaches a little further.':id==='teamwork'?'Better together. Your Dustlings are pairing up to clean.':'The crew knows its song. Clear 75% of the courtyard, then ring the fountain bell.');
  if(id==='teamwork')for(const c of s.creatures)c.target=null;
  return true;
}
export function assignCrew(s,x,y){
  if(!s.creatures.length){notify(s,'Brush a little dust first. Your helpers will come from it.');return false;}
  if(s.ritual){notify(s,'Your crew is singing to the fountain. They’ll return to tidying in a moment.');return false;}
  if(!walkable(x,y,3)){event(s,'blocked',{x,y});notify(s,'That spot is blocked. Choose an open patch of courtyard.');return false;}
  s.assignment={x,y};s.assignmentPulse=2.5;s.stats.assignments++;
  for(const c of s.creatures)c.target=null;
  event(s,'assign',{x,y});notify(s,'This way, little ones. Your crew will tidy around the flag.');return true;
}
export function releaseCrew(s){s.assignment=null;for(const c of s.creatures)c.target=null;notify(s,'Free to roam. Your crew will find the remaining dust.');}
export function beginRitual(s){
  if(!s.upgrades.bloom||s.cleaned/s.totalDust<.75||s.restoration>=1||s.ritual)return false;
  s.ritual=true;s.ritualTime=0;s.assignment=null;s.pointer.active=false;
  event(s,'landmark');notify(s,'A circle of little helpers. A song for the sleeping fountain.');return true;
}
function chooseTarget(s,c){
  // Pairing is visible: buddies share a cleaning site and approach side by side.
  if(s.upgrades.teamwork&&c.id%2===1){const lead=s.creatures[c.id-1];if(lead?.target!==null&&s.dust[lead?.target]?.amount>.0001)return lead.target;}
  let best=null,score=Infinity;
  const anchor=s.assignment||c;
  for(const d of s.dust){if(d.amount<=.00001)continue;
    const dist=Math.hypot(d.x-anchor.x,d.y-anchor.y);
    const occupied=s.creatures.reduce((n,other)=>n+(other.target===d.id?1:0),0);
    const v=dist+(s.assignment?Math.hypot(d.x-c.x,d.y-c.y)*.1:0)+occupied*(s.upgrades.teamwork?12:24);
    if(v<score){score=v;best=d.id;}
  }
  return best;
}
export function moveCreature(c,tx,ty,dt,speed=43){
  c.tx=tx;c.ty=ty;
  const dx=tx-c.x,dy=ty-c.y,dist=Math.hypot(dx,dy);
  if(dist<2)return dist;
  let ux=dx/dist,uy=dy/dist;
  // Follow a tangent around the circular fountain instead of walking through it.
  const fx=c.x-500,fy=c.y-370,fd=Math.hypot(fx,fy);
  const aheadX=c.x+ux*Math.min(dist,45),aheadY=c.y+uy*Math.min(dist,45);
  const dot=fx*ux+fy*uy;
  if((Math.hypot(aheadX-500,aheadY-370)<98||fd<98)&&dot<8){
    const cross=fx*dy-fy*dx;const sign=cross>=0?1:-1;
    ux=-fy/fd*sign+fx/fd*Math.max(0,(99-fd)/20);uy=fx/fd*sign+fy/fd*Math.max(0,(99-fd)/20);
    const len=Math.hypot(ux,uy);ux/=len;uy/=len;
  }
  const step=Math.min(dist,speed*dt);let nx=c.x+ux*step,ny=c.y+uy*step;
  const nd=Math.hypot(nx-500,ny-370);
  if(nd<91){nx=500+(nx-500)/nd*91;ny=370+(ny-370)/nd*91;}
  c.x=Math.max(115,Math.min(885,nx));c.y=Math.max(160,Math.min(655,ny));c.dir=Math.atan2(uy,ux);
  return dist;
}
export function tick(s,dt){
  dt=Math.min(.1,Math.max(0,dt));s.elapsed+=dt;
  s.noticeTime=Math.max(0,s.noticeTime-dt);s.assignmentPulse=Math.max(0,s.assignmentPulse-dt);s.celebration=Math.max(0,s.celebration-dt);
  if(!s.completed&&s.pointer.active&&s.mode==='brush'&&walkable(s.pointer.x,s.pointer.y)){
    const inBrush=s.dust.filter(d=>d.amount>0&&Math.hypot(d.x-s.pointer.x,d.y-s.pointer.y)<s.brushRadius);
    const weights=inBrush.map(d=>1-Math.hypot(d.x-s.pointer.x,d.y-s.pointer.y)/(s.brushRadius+10));const sum=weights.reduce((a,b)=>a+b,0);
    const rate=s.upgrades.brush?1.148:.85;
    inBrush.forEach((d,i)=>collect(s,d,rate*dt*weights[i]/sum,'brush'));
  }
  const remainingRatio=1-s.cleaned/s.totalDust;
  for(const c of s.creatures){
    c.work=0;
    if(s.elapsed-c.born<.65)continue;
    if(s.ritual||s.completed){
      const ring=c.id%2,ringCount=Math.ceil((s.creatures.length-ring)/2);
      const a=Math.floor(c.id/2)/Math.max(1,ringCount)*Math.PI*2-Math.PI/2+ring*.13;
      const radius=(ring?150:112)+(s.completed?9:0);
      const dist=moveCreature(c,500+Math.cos(a)*radius,370+Math.sin(a)*radius,dt,52);
      c.work=dist<6?1:0;continue;
    }
    if(c.target===null||s.dust[c.target]?.amount<=.00001)c.target=chooseTarget(s,c);
    if(c.target!==null){
      const d=s.dust[c.target];const offset=s.upgrades.teamwork?(c.id%2?7:-7):0;
      const dist=moveCreature(c,d.x+offset,d.y+7,dt,s.upgrades.teamwork?51:43);
      if(dist<17){c.work=1;collect(s,d,dt*(s.upgrades.teamwork?.0245:.014)*(remainingRatio<.06?3.0:1),'crew');}
    }else if(s.assignment)moveCreature(c,s.assignment.x+Math.cos(c.phase)*23,s.assignment.y+Math.sin(c.phase)*20,dt);
  }
  if(s.ritual){
    const gathered=s.creatures.filter(c=>Math.hypot(c.x-500,c.y-370)<164&&Math.hypot(c.x-500,c.y-370)>98).length;
    if(gathered>=Math.min(12,s.creatures.length)*.8){s.ritualTime+=dt;s.restoration=Math.min(1,s.ritualTime/38);}
    if(s.restoration>=1){s.ritual=false;s.celebration=7;event(s,'fountainRestored');notify(s,'Water, at last. Your crew will gather the last few specks.');for(const c of s.creatures)c.target=null;}
  }
  // The crew handles almost invisible remnants; completion never requires pixel hunting.
  if(s.creatures.length&&remainingRatio<.015&&!s.ritual){for(const d of s.dust)if(d.amount>0)collect(s,d,dt*.08,'crew');}
  if(s.cleaned>=s.totalDust-.0001&&s.restoration>=1&&!s.completed){
    s.cleaned=s.totalDust;s.completed=true;s.completedAt=s.elapsed;s.celebration=12;
    event(s,'complete');notify(s,'The courtyard is awake. All those little things made something beautiful.');
  }
  for(const p of s.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=14*dt;}
  s.particles=s.particles.filter(p=>p.life>0);
}
export function serialise(s){
  return {version:SAVE_VERSION,savedAt:Date.now(),dust:s.dust.map(d=>d.amount),motes:s.motes,upgrades:{...s.upgrades},elapsed:s.elapsed,restoration:s.restoration,ritual:s.ritual,ritualTime:s.ritualTime,completed:s.completed,firstHelperAt:s.firstHelperAt,firstUpgradeAt:s.firstUpgradeAt,completedAt:s.completedAt,assignment:s.assignment,creatures:s.creatures.map(({x,y,id,phase})=>({x,y,id,phase})),stats:structuredClone(s.stats)};
}
export function restore(data){
  if(!data||data.version!==SAVE_VERSION)throw Error('This save uses an unsupported version.');
  const s=createState();
  if(!Array.isArray(data.dust)||data.dust.length!==s.dust.length||data.dust.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('This save contains damaged courtyard data.');
  for(let i=0;i<s.dust.length;i++)s.dust[i].amount=data.dust[i];
  s.cleaned=s.dust.reduce((n,d)=>n+1-d.amount,0);s.earned=Math.floor(s.cleaned+.000001);
  for(const k of ['brush','teamwork','bloom'])s.upgrades[k]=data.upgrades?.[k]===true;
  if(s.upgrades.bloom&&(!s.upgrades.brush||!s.upgrades.teamwork))throw Error('This save contains an incomplete upgrade tree.');
  const spent=UPGRADES.reduce((n,u)=>n+(s.upgrades[u.id]?u.cost:0),0);
  if(spent>s.earned)throw Error('This save contains inconsistent progress.');
  s.motes=Math.max(0,s.earned-spent);s.brushRadius=s.upgrades.brush?64:44;
  s.elapsed=Number.isFinite(data.elapsed)?Math.max(0,data.elapsed):0;
  s.restoration=Number.isFinite(data.restoration)?Math.max(0,Math.min(1,data.restoration)):0;
  s.ritual=!!data.ritual&&s.upgrades.bloom&&s.restoration<1;
  s.ritualTime=s.restoration*38;
  s.completed=s.cleaned>=s.totalDust-.0001&&s.restoration>=1;
  for(const k of ['firstHelperAt','firstUpgradeAt','completedAt'])s[k]=Number.isFinite(data[k])?data[k]:null;
  if(data.assignment&&walkable(data.assignment.x,data.assignment.y,3))s.assignment={x:data.assignment.x,y:data.assignment.y};
  const count=Math.min(50,Math.floor((s.cleaned+.00001)/7));
  for(let i=0;i<count;i++){
    const c=data.creatures?.[i];let x=c?.x,y=c?.y;
    if(!Number.isFinite(x)||!Number.isFinite(y)||!walkable(x,y)){x=250+(i%8)*17;y=460+Math.floor(i/8)*17;}
    s.creatures.push({id:i,x,y,tx:x,ty:y,phase:i*2.399,born:-5,dir:0,work:0,target:null});
  }
  if(count)s.hintTarget=null;
  if(data.stats&&typeof data.stats==='object')s.stats={brushed:Number.isFinite(data.stats.brushed)?data.stats.brushed:0,assisted:Number.isFinite(data.stats.assisted)?data.stats.assisted:0,assignments:Number.isFinite(data.stats.assignments)?data.stats.assignments:0,upgrades:Array.isArray(data.stats.upgrades)?data.stats.upgrades.filter(x=>UPGRADES.some(u=>u.id===x.id)&&Number.isFinite(x.at)):[]};
  return s;
}
