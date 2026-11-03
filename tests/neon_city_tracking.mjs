// Exercise the real scene lifecycle with a matrix-only renderer and simulated XR poses.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=p=>fs.readFile(new URL(p,import.meta.url),'utf8');
const moduleFrom=async p=>import('data:text/javascript,'+encodeURIComponent(await read(p)));
const cg=await moduleFrom('../js/render/core/cg.js');
const rules=await moduleFrom('../js/scenes/neon_city_math.js');
const close=(a,b,msg)=>assert.ok(a.every((v,i)=>Math.abs(v-b[i])<1e-9),msg);
class Node {
 constructor(form='',parent=null){this.form=form;this.parent=parent;this.children=[];this.identity();}
 add(form){const n=new Node(form,this);this.children.push(n);return n;}
 identity(){this.m=cg.mIdentity();return this;}
 setMatrix(m){this.m=m.slice();return this;}
 getMatrix(){return this.m;}
 getGlobalMatrix(){return this.parent?cg.mMultiply(this.parent.getGlobalMatrix(),this.m):this.m;}
 transform(m){this.m=cg.mMultiply(this.m,m);return this;}
 move(...v){return this.transform(cg.mTranslate(Array.isArray(v[0])?v[0]:v));}
 scale(...v){return this.transform(cg.mScale(...v));}
 turnX(a){return this.transform(cg.mRotateX(a));}
 turnY(a){return this.transform(cg.mRotateY(a));}
 color(){return this;} dull(){return this;} opacity(){return this;}
 textBox(){if(!this.children.length)this.add('text');return this;}
 child(i){return this.children[i];}
 animate(f){this.tick=f;}
}
let ui;
const element=()=>({style:{},disabled:false,value:'',remove(){},querySelector(sel){return this.items[sel]??=(element());},querySelectorAll(){return Object.values(this.items);},items:{}});
globalThis.document={createElement(){return ui=element();},body:{appendChild(){}},addEventListener(){},removeEventListener(){}};
globalThis.window={vr:true};
globalThis.inputEvents={onPress(){},onDrag(){},onRelease(){}};
let pose=cg.mMultiply(cg.mTranslate([.3,1.7238,-.4]),cg.mRotateY(.6));
globalThis.clay={root:()=>({inverseViewMatrix:()=>pose})};
let game;
const buildCity=root=>({baseHit:root.add('square'),terminals:[],update:g=>game=g});
class ControllerBeam {update(){} hitRect(){return null;} beamMatrix(){return pose;}}
const controllerMatrix={left:cg.mTranslate([.1,1.2,-.6]),right:cg.mTranslate([.5,1.2,-.6])};
const source=(await read('../js/scenes/neon_city_2099.js')).replace(/^import .*;\n/gm,'').replaceAll('export const ','const ');
const factory=new (Object.getPrototypeOf(async function(){}).constructor)('cg','ControllerBeam','buttonState','controllerMatrix','buildCity','rules',`const {SCALE,TABLE_TOP,CITY_Y,WAYPOINTS,freshGame,activateTerminal,toCity,distance,sub,trackingFrame}=rules;${source};return {init,deinit};`);
const scene=await factory(cg,ControllerBeam,{left:[]},controllerMatrix,buildCity,rules);
// A translated/yawed scene origin must not corrupt physical floor height or entry.
const model=new Node();model.setMatrix(cg.mMultiply(cg.mTranslate([.2,.1,-.3]),cg.mRotateY(.25)));model.time=0;
await scene.init(model);model.tick();
const city=model.children[0],room=model.children[1],avatar=city.children[2],head=avatar.children[0];
assert.equal(head.form,'sphere');
assert.ok(Math.abs(head.m[13]-(rules.TABLE_TOP-rules.CITY_Y+1.7238/12))<1e-10);
const switchMode=()=>{ui.querySelector('[data-mode]').onclick();model.time+=.2;model.tick();model.time+=.2;model.tick();};
const travel=()=>{ui.querySelector('[data-travel]').onclick();model.time+=.2;model.tick();model.time+=.2;model.tick();};
pose=cg.mMultiply(cg.mTranslate([.54,1.42,-.7]),cg.mMultiply(cg.mRotateY(1.1),cg.mRotateX(-.25)));model.tick();
const before=head.m.slice(),handBefore=avatar.children[2].m.slice();
switchMode();assert.equal(game.viewMode,'MINIATURE');
// Undo decorative head dimensions: city transform * avatar pose = actual viewer pose.
close(cg.mMultiply(city.getGlobalMatrix(),cg.mMultiply(before,cg.mScale(1/.09,1/.105,1/.09))),pose,'entry preserves complete current eye pose');
close(cg.mMultiply(city.getGlobalMatrix(),cg.mMultiply(handBefore,cg.mScale(1/.05,1/.035,1/.07))),controllerMatrix.left,'controller shares the exact transform');
const expectedRoom=cg.mMultiply(city.getGlobalMatrix(),cg.mTranslate(game.cityPosition.map(v=>-v)));
close(room.getGlobalMatrix(),expectedRoom,'table transforms with the city');
switchMode();close(head.m,before,'return does not snap avatar');
switchMode();travel();assert.equal(game.currentWaypoint,1);
const afterTeleport=cg.mMultiply(cg.mInverse(city.getGlobalMatrix()),pose);
switchMode();close(cg.mMultiply(head.m,cg.mScale(1/.09,1/.105,1/.09)),afterTeleport,'return retains teleported viewpoint');
assert.ok(Math.abs(head.m[13]-(rules.TABLE_TOP-rules.CITY_Y+1.42/12))<1e-10,'teleport preserves crouched height');
scene.deinit();
console.log('PASS: actual scene mode switches, floor height, moved/turned/crouched pose, controller alignment, nonidentity scene origin, scaled table and teleport return');
