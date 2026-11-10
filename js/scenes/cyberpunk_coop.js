import * as cg from '../render/core/cg.js';
import { ControllerBeam, controllerMatrix } from '../render/core/controllerInput.js';
import { CHANNEL,FLOOR,STOPS,BRIDGE,CORE,TOWER,fresh,roleOf,prune,apply } from './cyberpunk_coop_state.js';
let leave=()=>{};
export const deinit=()=>leave();
export const init=async model=>{
 leave();model._cyberCleanup?.();server.init(CHANNEL,{});
 let state=fresh(),active=true,peers={},poses={},lastHello=-10,lastPose=-10,lastSnapshot=-10,leader=null,held=null,lastMove=-10,frame=null,frameKey='',lastText='';
 const id=()=>String(window.clientID),send=m=>server.send(CHANNEL,{...m,epoch:state.epoch});
 const world=model.add(),hud=model.add(),beam=new ControllerBeam(model,'right');
 const cube=(root,p,s,c)=>root.add('cube').move(p).scale(...s).color(c).dull();
 cube(world,[0,FLOOR-.025,-.65],[.36,.025,.27],[.015,.025,.05]);
 for(const x of [-.32,.32])for(const z of [-.88,-.42])cube(world,[x,.37,z],[.012,.37,.012],[.05,.1,.15]);
 for(const x of [-.24,.24])cube(world,[x,FLOOR,-.48],[.12,.006,.045],[.09,.16,.23]);
 cube(world,[.24,FLOOR,-.65],[.045,.006,.18],[.09,.16,.23]);
 const target=cube(world,BRIDGE,[.115,.003,.044],[.2,.5,.6]);
 const bridge=cube(world,[0,0,0],[.12,.009,.043],[1,.3,.55]);
 const buildings=[];
 for(let i=0;i<8;i++){
  const p=i<2?state.buildings[i]:[-.3+(i-2)*.105,FLOOR,-.94];
  const b=world.add().move(p),h=.09+(i%3)*.035;
  cube(b,[0,h,0],[.035,h,.035],[.035,.06,.12]);
  for(let y=.025;y<2*h;y+=.035)cube(b,[0,y,.036],[.026,.003,.001],[i%2?1:.1,.5,1]);
  buildings.push(b);
 }
 const core=world.add('sphere').move(CORE).scale(.022).color(.1,.9,1).dull();
 cube(world,[.24,FLOOR+.13,-.85],[.045,.13,.035],[.05,.12,.22]);
 const tower=cube(world,TOWER,[.025,.025,.008],[1,.3,.1]);
 const victory=world.add('tubeY').move(.24,FLOOR+.3,-.85).scale(.008,.3,.008).color(.1,1,.6).dull();
 const markers=STOPS.map(p=>cube(world,[p[0],p[1]+.008,p[2]],[.022,.002,.022],[.1,.9,.7]));
 const avatars={};
 for(const r of ['giant','runner']){const root=world.add();avatars[r]={root,head:root.add('sphere'),left:root.add('cube'),right:root.add('cube')};for(const n of [avatars[r].head,avatars[r].left,avatars[r].right])n.color(r==='giant'?[1,.3,.6]:[.1,1,1]).dull();}
 const label=(str,p,size)=>{const n=hud.add().textBox(str,.07).move(p).scale(size).color(.6,1,1).dull();n.child(0).scale(1,1,.001);return n;};
 cube(hud,[0,0,-.01],[.42,.15,.005],[.01,.025,.05]);
 label('CYBERPUNK / GIANT & RUNNER',[0,.11,0],.29);
 const status=label('SELECT YOUR ROLE',[0,.06,0],.23);
 const actions=[['giant','GIANT',-.29],['runner','RUNNER',-.1],['back','BACK',.1],['next','NEXT',.29],['reset','RESET',0]].map(([action,title,x])=>{const y=action==='reset'?-.11:-.025;const node=hud.add('square').move(x,y,.002).scale(.085,.025,1).color(.05,.3,.4).dull();label(title,[x,y,.005],.14);return {action,node};});
 const trackedHead=()=>{const m=clay.root().inverseViewMatrix(0).slice();if(window.vr){const r=clay.root().inverseViewMatrix(1);for(let i=12;i<15;i++)m[i]=(m[i]+r[i])/2;}return m;};
 const physicalHand=hand=>controllerMatrix[hand];
 const trackingToWorld=()=>cg.mInverse(frame);
 const handWorld=()=>cg.mTransform(trackingToWorld(),beam.beamMatrix().slice(12,15));
 function action(a){
  const r=roleOf(state,id());
  if(a==='giant'||a==='runner')send({type:'ROLE_SELECT',role:a});
  if(a==='reset')send({type:'RESET'});
  if(r==='runner'&&(a==='next'||a==='back'))send({type:'TRAVEL',stop:state.stop+(a==='next'?1:-1)});
 }
 const ui=document.createElement('section');ui.style.cssText='position:fixed;bottom:16px;left:16px;z-index:10000;background:#071321ee;color:#bfffff;padding:16px;width:310px;font:13px system-ui;border:1px solid cyan;border-radius:10px';
 ui.innerHTML='<b>CYBERPUNK CO-OP · 1:12</b><p data-status></p><button data-action="giant">Giant</button> <button data-action="runner">Runner</button><p><button data-action="back">Back</button> <button data-action="next">Next waypoint</button> <button data-touch>Touch core / tower</button></p><button data-grab>Grab / release bridge</button><label>Bridge X <input data-x type="range" min="-.3" max=".3" step=".005" value="-.24"></label><label>Bridge Z <input data-z type="range" min="-.9" max="-.4" step=".005" value="-.72"></label><p><button data-action="reset">Reset mission</button></p><small>Two real browser clients: select different roles. Giant: grab, move X to 0 and Z to -0.48, release. Runner: Next, Next, Touch, Next, Touch. VR: right trigger on HUD / objects; hold to drag. Pink buildings can also be moved.</small>';
 document.body.appendChild(ui);ui.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
 let desktopGrab=false;
 ui.querySelector('[data-grab]').onclick=()=>{if(roleOf(state,id())!=='giant')return;desktopGrab=!desktopGrab;if(!desktopGrab)send({type:'BRIDGE_PLACED'});};
 const moveDesktop=()=>{if(desktopGrab)send({type:'MOVE_BRIDGE',position:[+ui.querySelector('[data-x]').value,FLOOR,+ui.querySelector('[data-z]').value]});};
 ui.querySelector('[data-x]').oninput=moveDesktop;ui.querySelector('[data-z]').oninput=moveDesktop;
 ui.querySelector('[data-touch]').onclick=()=>{if(roleOf(state,id())==='runner')send({type:state.stop===2?'CORE_COLLECTED':'TOWER_ACTIVATED',position:state.stop===2?CORE:TOWER});};
 const old={onPress:inputEvents.onPress,onDrag:inputEvents.onDrag,onRelease:inputEvents.onRelease};
 const onPress=hand=>{
  if(hand!=='right'||!frame)return;beam.update();
  const hit=actions.find(b=>beam.hitRect(b.node.getGlobalMatrix()));if(hit){action(hit.action);return;}
  const p=handWorld(),r=roleOf(state,id());
  if(r==='giant'){
   const d=(a,b)=>cg.distance(a,b);
   if(!state.bridgePlaced&&d(p,state.bridge)<.15)held={kind:'bridge',offset:state.bridge.map((v,i)=>v-p[i])};
   else for(let i=0;i<2;i++)if(d(p,state.buildings[i].map((v,j)=>v+(j===1?.1:0)))<.15){held={kind:'building',index:i,offset:state.buildings[i].map((v,j)=>v-p[j])};break;}
  }
  if(r==='runner')send({type:state.stop===2?'CORE_COLLECTED':'TOWER_ACTIVATED',position:p});
 };
 const onDrag=hand=>{if(hand!=='right'||!held||model.time-lastMove<.05)return;lastMove=model.time;const p=handWorld().map((v,i)=>v+held.offset[i]);p[1]=Math.max(FLOOR,p[1]);send({type:held.kind==='bridge'?'MOVE_BRIDGE':'MOVE_BUILDING',index:held.index,position:p});};
 const onRelease=hand=>{if(hand==='right'){if(held?.kind==='bridge'){lastMove=-10;onDrag(hand);send({type:'BRIDGE_PLACED'});}held=null;}};
 Object.assign(inputEvents,{onPress,onDrag,onRelease});
 leave=()=>{active=false;send({type:'LEAVE'});server.sync(CHANNEL,()=>{});ui.remove();for(const [k,f]of Object.entries({onPress,onDrag,onRelease}))if(inputEvents[k]===f)inputEvents[k]=old[k];};model._cyberCleanup=leave;
 model.animate(()=>{
  if(!active)return;const now=model.time,live=(window.clients||[]).map(String);
  if(now-lastHello>.5){send({type:'HELLO'});lastHello=now;}
  const pending=[];
  server.sync(CHANNEL,(messages,sender)=>{sender=String(sender);if(!live.includes(sender))return;for(const m of Object.values(messages)){
   if(m.type==='HELLO')peers[sender]=now;
   else if(m.type==='POSE')poses[sender]={...m,time:now};
   else pending.push([m,sender]);
  }});
  for(const p of Object.keys(peers))if(!live.includes(p)||now-peers[p]>4)delete peers[p];
  const nextLeader=Object.keys(peers).sort((a,b)=>Number(a)-Number(b))[0];
  if(nextLeader!==leader){leader=nextLeader;lastSnapshot=-10;}
  for(const [m,sender]of pending){
   if(m.type==='SNAPSHOT'&&sender===leader&&m.state&&m.state.revision>=state.revision)state=m.state;
   else if(id()===leader&&m.type!=='SNAPSHOT')apply(state,m,sender);
  }
  if(id()===leader){prune(state,Object.keys(peers));if(now-lastSnapshot>.1){send({type:'SNAPSHOT',state:JSON.parse(JSON.stringify(state))});lastSnapshot=now;}}
  const role=roleOf(state,id()),head=trackedHead();
  const key=`${role}/${state.stop}/${state.epoch}/${!!window.vr}`;
  if(key!==frameKey){frameKey=key;held=null;desktopGrab=false;
   frame=role==='runner'?cg.mMultiply(cg.mTranslate([head[12],0,head[14]]),cg.mMultiply(cg.mRotateY(Math.atan2(head[8],head[10])),cg.mMultiply(cg.mScale(12),cg.mTranslate(STOPS[state.stop].map(v=>-v))))):cg.mIdentity();
  }
  world.setMatrix(cg.mMultiply(cg.mInverse(model.getGlobalMatrix()),frame));
  bridge.identity().move(state.bridge).scale(.12,.009,.043);target.color(state.bridgePlaced?[.1,1,.4]:[.3,.1,.15]);
  buildings.slice(0,2).forEach((b,i)=>b.identity().move(state.buildings[i]));
  core.identity().move(CORE).scale(state.coreCollected?0:.022).turnY(now);
  tower.color(state.success?[.1,1,.4]:[1,.3,.1]);victory.identity().move(.24,FLOOR+.3,-.85).scale(state.success?.008:0,.3,.008);
  markers.forEach((n,i)=>n.color(i===state.stop?[1,.8,.1]:[.1,.5,.6]));
  // Publish poses already mapped into the one shared world. The same inverse
  // transform is used for controller interaction and the Runner camera.
  if(role&&now-lastPose>.05){const inv=trackingToWorld(),packet={type:'POSE',head:cg.mMultiply(inv,head)};for(const h of ['left','right']){
   const m=window.vr?physicalHand(h):cg.mMultiply(head,cg.mTranslate([h==='left'?-.2:.2,-.3,-.3]));
   if(m?.length===16)packet[h]=cg.mMultiply(inv,m);
  }send(packet);lastPose=now;}
  for(const r of ['giant','runner']){const a=avatars[r],p=poses[state.roles[r]],visible=r!==role&&p&&now-p.time<2;a.root.identity().scale(visible?1:0);if(visible)for(const part of ['head','left','right'])if(p[part]?.length===16)a[part].setMatrix(p[part]).scale(part==='head'?.09:.045);}
  hud.setMatrix(cg.mMultiply(cg.mInverse(model.getGlobalMatrix()),cg.mMultiply(head,cg.mTranslate([0,.26,-.9]))));beam.update();
  const ready=state.roles.giant!==null&&state.roles.runner!==null;
  const msg=state.success?'MISSION COMPLETE':!role?'SELECT YOUR ROLE':!ready?'WAITING FOR PARTNER':!state.bridgePlaced?'GIANT: REPAIR THE BRIDGE':!state.coreCollected?'RUNNER: REACH THE CORE':'RUNNER: ACTIVATE THE TOWER';
  const text=`${role?.toUpperCase()||'SPECTATOR'} / ${msg}`;if(text!==lastText){status.textBox(text,.07);lastText=text;}
  ui.style.display=window.vr?'none':'block';ui.querySelector('[data-status]').textContent=`${text} · waypoint ${state.stop+1}/4 · client ${id()}`;
  ui.querySelectorAll('[data-action]').forEach(b=>{const a=b.dataset.action;b.disabled=['giant','runner'].includes(a)?!!role||state.roles[a]!==null:a==='reset'?!role:role!=='runner'||!ready||(a==='next'?(state.stop===3||!state.bridgePlaced):state.stop===0);});
  ui.querySelector('[data-grab]').disabled=role!=='giant'||!ready||state.bridgePlaced;
  for(const axis of ['x','z'])ui.querySelector(`[data-${axis}]`).disabled=!desktopGrab;
  ui.querySelector('[data-touch]').disabled=role!=='runner'||!ready||![2,3].includes(state.stop);
 });
};
