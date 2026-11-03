import * as cg from '../render/core/cg.js';
import { ControllerBeam, buttonState, controllerMatrix } from '../render/core/controllerInput.js';
import { buildCity } from './neon_city_buildings.js';
import { SCALE, WAYPOINTS, freshGame, activateTerminal, toCity, distance, sub } from './neon_city_math.js';
let leave=()=>{};
export const deinit=()=>leave();
export const init=async model=>{
  model._neonCityCleanup?.();
  leave();
  const game=freshGame();
  let active=true,hover=null,held=null,frame=null,normalFrame=null,lastStatus='',transition=null;
  let modeButton=4,travelButton=3,previous={},wasVR=!!window.vr;
  const cityRoot=model.add(),city=buildCity(cityRoot);
  const room=model.add();
  room.add('cube').move(0,.735,-.65).scale(.43,.025,.30).color(.025,.04,.065).dull();
  for(const x of [-.38,.38])for(const z of [-.9,-.4])room.add('cube').move(x,.36,z).scale(.012,.36,.012).color(.06,.09,.13).dull();
  // Opaque low-poly enclosure excludes the default classroom in the street view.
  const night=cityRoot.add();
  night.add('cube').move(0,-.065,0).scale(4,.01,4).color(.008,.012,.025).dull();
  for(const z of [-4,4])night.add('cube').move(0,2,z).scale(4,2,.01).color(.008,.012,.025).dull();
  for(const x of [-4,4])night.add('cube').move(x,2,0).scale(.01,2,4).color(.008,.012,.025).dull();
  night.add('cube').move(0,4,0).scale(4,.01,4).color(.008,.012,.025).dull();
  const avatar=cityRoot.add();
  const avatarHead=avatar.add('sphere').color(.2,.95,1).dull();
  avatarHead.add('cube').move(0,0,-.8).scale(.7,.25,.3).color(.02,.08,.13).dull();
  const torso=avatar.add('cube').color(.08,.3,.45).dull();
  const hands=['left','right'].map(()=>avatar.add('cube').color(1,.25,.6).dull());
  const beam=new ControllerBeam(model,'right');
  const hud=model.add();
  const text=(value,p,size,parent=hud)=>{
    const n=parent.add().textBox(value,.075).move(p).scale(size).color(.4,.9,1).dull();n.child(0).scale(1,1,.001);return n;
  };
  hud.add('cube').move(0,0,-.003).scale(.30,.105,.002).color(.015,.03,.055).dull();
  text('NEON CITY 2099',[0,.07,0],.24);
  const status=text('',[0,.025,0],.19);
  const hint=text('',[0,-.015,0],.15);
  const hudButtons=[['mode','ENTER / RETURN',-.15],['travel','NEXT STOP',.15]].map(([id,label,x])=>({id,node:hud.add('square').move(x,-.067,.002).scale(.13,.022,1).color(.06,.25,.34).dull(),label:text(label,[x,-.068,.004],.14)}));
  const veil=model.add('square').color(0,0,0).dull().opacity(0);
  const headMatrix=()=>cg.mMultiply(cg.mInverse(model.getGlobalMatrix()),clay.root().inverseViewMatrix(0));
  const headFrame=eye=>{const m=headMatrix();return {head:m.slice(12,15),eye:eye.slice(),yaw:Math.atan2(m[8],m[10])};};
  function placeCity(){
    cityRoot.identity();
    if(game.viewMode==='NORMAL')cityRoot.move(game.cityPosition);
    else cityRoot.move(frame.head).turnY(frame.yaw).scale(SCALE).move(frame.eye.map(v=>-v));
    room.identity().scale(game.viewMode==='NORMAL'?1:0);
    night.identity().scale(game.viewMode==='MINIATURE'?1:0);
  }
  function request(action){
    if(transition||held)return;
    if(action==='travel'&&game.viewMode!=='MINIATURE')return;
    transition={start:model.time,action,applied:false};
  }
  function apply(action){
    if(action==='reset'){Object.assign(game,freshGame());normalFrame=headFrame(WAYPOINTS[0].eye);}
    else if(action==='mode')game.viewMode=game.viewMode==='NORMAL'?'MINIATURE':'NORMAL';
    else if(action==='travel')game.currentWaypoint=(game.currentWaypoint+1)%WAYPOINTS.length;
    if(game.viewMode==='MINIATURE')frame=headFrame(WAYPOINTS[game.currentWaypoint].eye);
    else normalFrame=headFrame(WAYPOINTS[game.currentWaypoint].eye);
    placeCity();
  }
  const localHand=()=>{
    const bm=beam.beamMatrix();return cg.mTransform(cg.mInverse(model.getGlobalMatrix()),bm.slice(12,15));
  };
  function pick(){
    if(transition)return null;
    for(const b of hudButtons)if(beam.hitRect(b.node.getGlobalMatrix()))return b.id;
    if(game.viewMode==='NORMAL')return beam.hitRect(city.baseHit.getGlobalMatrix())?'base':null;
    const hand=toCity(localHand(),frame);
    return city.terminals.find(t=>!game.power[t.id]&&distance(hand,t.p)<=.095&&beam.hitRect(t.screen.getGlobalMatrix()))?.id||null;
  }
  const old={onPress:inputEvents.onPress,onDrag:inputEvents.onDrag,onRelease:inputEvents.onRelease};
  const onPress=hand=>{
    if(hand!=='right'||transition)return;
    beam.update();hover=pick();
    if(hover==='mode'||hover==='travel')request(hover);
    else if(hover==='base')held={hand:localHand(),city:game.cityPosition.slice()};
    else if(hover)activateTerminal(game,hover,toCity(localHand(),frame));
  };
  const onDrag=hand=>{
    if(hand!=='right'||!held)return;
    beam.update();const delta=sub(localHand(),held.hand);
    game.cityPosition=held.city.map((v,i)=>v+delta[i]);placeCity();
  };
  const onRelease=hand=>{if(hand==='right'&&held){held=null;game.cityPosition[0]=Math.max(-.08,Math.min(.08,game.cityPosition[0]));game.cityPosition[1]=.78;game.cityPosition[2]=Math.max(-.725,Math.min(-.575,game.cityPosition[2]));placeCity();}};
  inputEvents.onPress=onPress;inputEvents.onDrag=onDrag;inputEvents.onRelease=onRelease;
  const ui=document.createElement('section');
  ui.style.cssText='position:fixed;left:16px;bottom:16px;z-index:10000;width:300px;padding:16px;border:1px solid #38dfef;border-radius:12px;background:#071321ef;color:#c9f7ff;font:13px system-ui';
  ui.innerHTML='<b style="letter-spacing:2px">NEON CITY / 2099</b><p data-status></p><button data-mode>Enter / return [M]</button> <button data-travel>Next stop [N]</button><p><button data-activate>Activate nearby terminal [E]</button> <button data-reset>Restart</button></p><p>Quest: right trigger = grab / activate. Aim at the floating buttons for Enter / Return and Next Stop.</p><details><summary>Quest button mapping / diagnostics</summary><p>Defaults: left X = 4; stick click = 3. Verify on your headset or change below.</p><label>Mode index <input data-mode-index type="number" min="1" max="6" value="4" style="width:40px"></label> <label>Travel index <input data-travel-index type="number" min="1" max="6" value="3" style="width:40px"></label><p data-buttons></p></details><p style="margin-bottom:0">Desktop previews the same mission state. Physical tracking and stereo comfort need a Quest check.</p>';
  document.body.appendChild(ui);
  const desktopActivate=()=>{
    if(transition||window.vr)return;
    const w=WAYPOINTS[game.currentWaypoint];
    if(w.terminal)activateTerminal(game,w.terminal,w.eye);
  };
  ui.querySelector('[data-mode]').onclick=()=>request('mode');
  ui.querySelector('[data-travel]').onclick=()=>request('travel');
  ui.querySelector('[data-activate]').onclick=desktopActivate;
  ui.querySelector('[data-reset]').onclick=()=>request('reset');
  ui.querySelector('[data-mode-index]').onchange=e=>{const v=+e.target.value;if(Number.isInteger(v)&&v>=1&&v<=6&&v!==travelButton)modeButton=v;else e.target.value=modeButton;};
  ui.querySelector('[data-travel-index]').onchange=e=>{const v=+e.target.value;if(Number.isInteger(v)&&v>=1&&v<=6&&v!==modeButton)travelButton=v;else e.target.value=travelButton;};
  const key=e=>{
    if(e.repeat||window.vr||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    if(e.code==='KeyM')request('mode');if(e.code==='KeyN')request('travel');if(e.code==='KeyE')desktopActivate();
  };
  document.addEventListener('keydown',key);
  leave=()=>{
    active=false;ui.remove();document.removeEventListener('keydown',key);
    for(const [name,handler] of Object.entries({onPress,onDrag,onRelease}))if(inputEvents[name]===handler)inputEvents[name]=old[name];
  };
  // The course hot reloader imports a fresh module without calling old deinit.
  model._neonCityCleanup=leave;
  model.animate(()=>{
    if(!active)return;
    const hm=headMatrix();
    if(!normalFrame)normalFrame=headFrame(WAYPOINTS[0].eye);
    if(wasVR!==!!window.vr){held=null;transition=null;game.viewMode='NORMAL';normalFrame=headFrame(WAYPOINTS[game.currentWaypoint].eye);previous={};wasVR=!!window.vr;}
    const left=buttonState.left||[];
    for(const [idx,action] of [[modeButton,'mode'],[travelButton,'travel']]){
      const down=!!left[idx]?.pressed;if(window.vr&&down&&!previous[idx])request(action);previous[idx]=down;
    }
    let opacity=0;
    if(transition){
      const elapsed=model.time-transition.start;opacity=Math.max(0,1-Math.abs(elapsed-.18)/.18);
      if(elapsed>=.18&&!transition.applied){apply(transition.action);transition.applied=true;}
      if(elapsed>=.36)transition=null;
    }
    veil.setMatrix(hm).move(0,0,-.08).scale(.5,.5,1).opacity(opacity);
    placeCity();beam.update();hover=pick();
    // In normal mode, physical head/hands drive a 1:12 avatar around the entry anchor.
    avatar.identity().scale(game.viewMode==='NORMAL'?1:0);
    if(game.viewMode==='NORMAL'){
      const map=matrix=>cg.mMultiply(cg.mTranslate(normalFrame.eye),cg.mMultiply(cg.mScale(1/SCALE),cg.mMultiply(cg.mRotateY(-normalFrame.yaw),cg.mMultiply(cg.mTranslate(normalFrame.head.map(v=>-v)),matrix))));
      const mapped=map(hm);avatarHead.setMatrix(mapped).scale(.09,.105,.09);
      const p=mapped.slice(12,15);torso.identity().move(p[0],p[1]-.025,p[2]).turnY(Math.atan2(mapped[8],mapped[10])).scale(.012,.016,.008);
      ['left','right'].forEach((hand,i)=>{
        const m=controllerMatrix[hand];
        if(window.vr&&m?.length===16)hands[i].setMatrix(map(cg.mMultiply(cg.mInverse(model.getGlobalMatrix()),m))).scale(.05,.035,.07);
        else hands[i].identity().move(p[0]+(i?1:-1)*.023,p[1]-.027,p[2]-.012).scale(.004);
      });
    }
    hud.identity();
    if(game.viewMode==='NORMAL')hud.move(0,1.16,-.95);
    else hud.move(frame.head).turnY(frame.yaw).move(0,.25,-.85);
    const count=Object.values(game.power).filter(Boolean).length;
    const message=`${game.cityRestored?'CITY ONLINE':'RESTORE POWER'} / ${count}/3`;
    const detail=game.viewMode==='NORMAL'?'GRAB THE BASE / ENTER THE CITY':WAYPOINTS[game.currentWaypoint].name;
    const combined=message+detail;
    if(lastStatus!==combined){status.textBox(message,.075).color(game.cityRestored?[.2,1,.7]:[.4,.9,1]);hint.textBox(detail,.075);lastStatus=combined;}
    hudButtons.forEach(b=>b.node.color(hover===b.id?[.2,.65,.7]:[.06,.25,.34]));
    city.update(game,model.time,held?'base':hover);
    ui.style.display=window.vr?'none':'block';
    ui.querySelectorAll('button').forEach(b=>b.disabled=!!transition);
    if(!transition){
      ui.querySelector('[data-travel]').disabled=game.viewMode!=='MINIATURE';
      ui.querySelector('[data-activate]').disabled=game.viewMode!=='MINIATURE'||!WAYPOINTS[game.currentWaypoint].terminal||game.power[WAYPOINTS[game.currentWaypoint].terminal];
    }
    ui.querySelector('[data-status]').textContent=`${message} · ${game.viewMode} · ${WAYPOINTS[game.currentWaypoint].name}`;
    ui.querySelector('[data-buttons]').textContent='Left pressed: '+left.map((b,i)=>b?.pressed?i:null).filter(i=>i!==null).join(', ');
  });
};
