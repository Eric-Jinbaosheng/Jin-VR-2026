// Assignment 6 — RELAY / shared kinetic playground.
// G2 canvas widgets follow the course widgets.js pattern; bounded spheres,
// hand impulses, gravity and pair collisions adapt bouncing.js to shared play.
import { G2 } from '../util/g2.js';
import { R, freshState, launch, step, validPoint, clamp } from './relay_physics.js';
const CHANNEL='hw6RelayMessages';
let leave=()=>{};
export const init=async model=>{
 leave(); server.init(CHANNEL,{});
 let state=freshState(), peers={}, now=0, lastSend=-1, lastSnapshot=-1, active=true, previous={}, accumulator=0;
 const id=()=>String(window.clientID);
 const send=m=>{if(window.clientID!==undefined)server.send(CHANNEL,m);};
 const members=()=>Object.keys(peers).filter(k=>now-peers[k].seen<2.5 && (window.clients||[]).some(c=>String(c)===k)).sort((a,b)=>Number(a)-Number(b));
 const host=()=>members()[0];
 const command=(action,value)=>send({type:'command',action,value});
 const label=(text,p,size=.06,color=[.8,.9,1])=>model.add().textBox(text,size).move(p).color(color).dull();
 label('R E L A Y', [0,2.38,-1.7],.16);
 label('TWO HANDS. TWO PLAYERS. ONE CHARGE.',[0,2.19,-1.7],.043);
 label('1  TOUCH  >  2  PASS TO A PARTNER  >  3  HIT THE MINT GATE',[0,.53,-.5],.033);
 model.add('cube').move(0,.65,-1.1).scale(1.23,.025,1.02).color(.025,.045,.08).dull();
 for(const x of [-1.2,1.2]) for(const z of [-2.1,-.1]) model.add('cube').move(x,1.33,z).scale(.014,.67,.014).color(.12,.38,.5).dull();
 for(const y of [.67,2.04]) {
  for(const x of [-1.2,1.2]) model.add('cube').move(x,y,-1.1).scale(.009,.009,1).color(.1,.3,.4).dull();
  for(const z of [-2.1,-.1]) model.add('cube').move(0,y,z).scale(1.2,.009,.009).color(.1,.3,.4).dull();
 }
 for(const x of [-.65,.65]) model.add('cube').move(x,1.35,-2.06).scale(.025,.52,.025).color(.25,1,.7).dull();
 for(const y of [.83,1.87]) model.add('cube').move(0,y,-2.06).scale(.67,.025,.025).color(.25,1,.7).dull();
 label('CHARGED ORBS ONLY',[0,1.98,-2.06],.035,[.25,1,.7]);
 const orbs=Array.from({length:4},()=>model.add('sphere'));
 const paddles=Array.from({length:16},()=>model.add('sphere').scale(0));
 const canvases=[];
 function station(slot,title,subtitle,pos,scale) {
  const g=new G2(),obj=model.add('square').move(pos).scale(scale).txtr(slot).dull();model.txtrSrc(slot,g.getCanvas());
  g.render=function(){this.setColor('#101e30').fillRect(-1,-1,2,2);this.setColor('#72ead0').textHeight(.11);this.text(title,0,.72,'center');this.setColor('#c4d7eb').textHeight(.065);this.text(subtitle(),0,.43,'center');};
  canvases.push(g);return {g,obj};
 }
 const dock=station(10,'LAUNCH DOCK',()=>members().length<2?'Waiting for a second player':'90 seconds / 8 shared goals',[-.88,.96,.02],.29);
 dock.g.addWidget(dock.obj,'button',0,.08,'#78efd1',['START / RESTART'],()=>command('start'),2.1);
 const grav=station(11,'GRAVITY FIELD',()=>`Gravity: ${( .1+state.gravity*.75).toFixed(2)} m/s2`,[0,2.85,-1.1],.29);
 const gs=grav.g.addWidget(grav.obj,'slider',0,.05,'#b6abff','GRAVITY',v=>command('gravity',v),2.4);
 const power=station(12,'IMPULSE DRIVE',()=>`Speed: ${( .65+state.speed*1.15).toFixed(2)}x`,[1.48,1.3,-1.05],.29);
 const ss=power.g.addWidget(power.obj,'slider',0,.05,'#ffcc83','SPEED',v=>command('speed',v),2.4);
 const board=station(13,'TEAM TELEMETRY',()=>`${state.score} / ${state.goal}    |    ${Math.ceil(state.time)} SEC`,[0,1.55,-2.2],.43);
 const renderBoard=board.g.render;
 board.g.render=function(){renderBoard.call(this);this.setColor('#ffffff').textHeight(.065);this.text(state.phase==='won'?'RELAY COMPLETE':state.phase==='over'?'TIME UP - TRY AGAIN':members().length<2?'WAITING FOR PARTNER':state.phase==='ready'?'START AT THE LAUNCH DOCK':'PASS > CHARGE > GOAL',0,.12,'center');this.textHeight(.055);this.text('BLUE: untouched / AMBER: one player',0,-.3,'center');this.text('MINT: two players / aim for this gate',0,-.5,'center');};
 // Desktop accessibility/test input participates in the exact same multiplayer channel.
 const ui=document.createElement('section');ui.style.cssText='position:fixed;bottom:12px;left:12px;z-index:10000;background:#101e30ed;color:#daecff;padding:12px;border:1px solid #72ead0;border-radius:12px;font:13px system-ui;width:250px';
 ui.innerHTML='<b>RELAY · desktop paddle</b><p data-status></p><label><input data-enable type="checkbox"> Enable desktop paddle</label><div data-axes></div><button data-start>Start / restart</button><p style="margin-bottom:0">Open the relay_arena scene in two windows. Move your paddle into an orb; pass it to the other player, then hit the mint gate.</p>';
 const axes=ui.querySelector('[data-axes]');
 const ranges=[[-1.1,1.1,0],[.75,1.95,1.3],[-1.95,-.2,-.7]].map((a,k)=>{let l=document.createElement('label');l.style.display='block';l.textContent=['X · left / right','Y · height','Z · depth'][k];let r=document.createElement('input');r.type='range';r.min=a[0];r.max=a[1];r.step='.01';r.value=a[2];r.style.width='100%';l.appendChild(r);axes.appendChild(l);return r;});
 document.body.appendChild(ui);ui.querySelector('[data-start]').onclick=()=>command('start');
 function localHands(dt){
  const points=[];
  if(ui.querySelector('[data-enable]').checked)points.push(['desktop',ranges.map(r=>+r.value)]);
  else if(window.vr) for(const hand of ['left','right']){let p=inputEvents.pos(hand);if(validPoint(p))points.push([hand,p.slice()]);}
  return points.map(([key,p])=>{const old=previous[key]||p;previous[key]=p.slice();return {id:id(),p,v:p.map((x,k)=>clamp((x-old[k])/Math.max(dt,.001),-3,3))};});
 }
 leave=()=>{if(!active)return;send({type:'leave'});server.sync(CHANNEL,()=>{});active=false;ui.remove();};
 model.animate(()=>{
  if(!active)return;
  const dt=Math.min(.05,Math.max(0,model.deltaTime||1/60));now=performance.now()/1000;
  // Presence has a lease, so a scene exit or host loss transfers authority.
  server.sync(CHANNEL,(messages,sender)=>{for(const m of Object.values(messages)){
   const who=String(sender);if(!m)continue;
   if(m.type==='presence')peers[who]={seen:now,hands:Array.isArray(m.hands)?m.hands.filter(h=>validPoint(h.p)).map(h=>({...h,id:who})):[]};
   if(m.type==='leave')delete peers[who];
   if(m.type==='snapshot'&&who===host()&&who!==id()&&m.state?.balls)state=m.state;
   if(m.type==='command'&&host()===id()&&members().includes(who)){
    if(m.action==='start'&&members().length>=2)launch(state);
    if(['gravity','speed'].includes(m.action)&&Number.isFinite(m.value))state[m.action]=clamp(m.value,0,1);
   }
  }});
  const hands=localHands(dt);
  if(window.clientID!==undefined){peers[id()]={seen:now,hands};if(now-lastSend>.05){send({type:'presence',hands});lastSend=now;}}
  const ids=members();
  if(host()===id()){
   accumulator+=dt;while(accumulator>=1/120){step(state,1/120,ids.flatMap(k=>peers[k].hands),ids);accumulator-=1/120;}
   if(now-lastSnapshot>.05){state.serial++;send({type:'snapshot',state:JSON.parse(JSON.stringify(state))});lastSnapshot=now;}
  }else accumulator=0;
  orbs.forEach((o,i)=>{const b=state.balls[i];o.identity();if(!b){o.scale(0);return;}o.move(b.p).scale(R*(b.flash>0?1.16:1)).color(b.flash>0?[1,1,1]:b.touches.length>=2?[.25,1,.7]:b.touches.length?[1,.65,.25]:[.2,.6,1]).dull();});
  const allHands=ids.flatMap(k=>peers[k].hands);
  paddles.forEach((o,i)=>{o.identity();const h=allHands[i];if(h)o.move(h.p).scale(.09).color(h.id===id()?[.5,.75,1]:[1,.5,.3]).dull();else o.scale(0);});
  gs.setValue(state.gravity);ss.setValue(state.speed);canvases.forEach(g=>g.update());
  ui.style.display=window.vr?'none':'block';
  ui.querySelector('[data-status]').textContent=`${ids.length} players · ${state.score}/8 · ${Math.ceil(state.time)}s · ${ids.length<2?'Waiting for partner':state.phase}`;
 });
};
export const deinit=()=>leave();
