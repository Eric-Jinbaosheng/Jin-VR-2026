// Exercise the real scene lifecycle with a matrix-only renderer and simulated XR poses.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read=p=>fs.readFile(new URL(p,import.meta.url),'utf8');
const moduleFrom=async p=>import('data:text/javascript,'+encodeURIComponent(await read(p)));
const cg=await moduleFrom('../js/render/core/cg.js');
const rules=await moduleFrom('../js/scenes/cyberpunk_coop_state.js');
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
const element=()=>({style:{},disabled:false,value:'',remove(){},querySelector(sel){return this.items[sel]??=(element());},querySelectorAll(){return [];},items:{}});
globalThis.document={createElement(){return ui=element();},body:{appendChild(){}},addEventListener(){},removeEventListener(){}};
globalThis.window={vr:true};
globalThis.inputEvents={onPress(){},onDrag(){},onRelease(){}};
let pose=cg.mMultiply(cg.mTranslate([.3,1.7238,-.4]),cg.mRotateY(.6));
globalThis.clay={root:()=>({inverseViewMatrix:()=>pose})};

class ControllerBeam {update(){} hitRect(){return null;} beamMatrix(){return pose;}}
const controllerMatrix={left:cg.mTranslate([.1,1.2,-.6]),right:cg.mTranslate([.5,1.2,-.6])};
window.clientID=7;window.clients=[7,29];
let queue=[],remote=[],out=[];
globalThis.server={init(){},send(channel,m){queue.push(structuredClone(m));out.push(structuredClone(m));},sync(channel,cb){const local=queue;queue=[];if(local.length)cb(local,7);const other=remote;remote=[];if(other.length)cb(other,29);}};
const source=(await read('../js/scenes/cyberpunk_coop.js')).replace(/^import .*;\n/gm,'').replaceAll('export const ','const ');
const factory=new (Object.getPrototypeOf(async function(){}).constructor)('cg','ControllerBeam','controllerMatrix','rules',`const {CHANNEL,FLOOR,STOPS,BRIDGE,CORE,TOWER,fresh,roleOf,prune,apply}=rules;${source};return {init,deinit};`);
const scene=await factory(cg,ControllerBeam,controllerMatrix,rules);
const model=new Node();model.setMatrix(cg.mMultiply(cg.mTranslate([.2,.1,-.3]),cg.mRotateY(.25)));model.time=0;
await scene.init(model);
const tick=()=>{model.time+=.12;model.tick();};
remote.push({type:'HELLO'},{type:'ROLE_SELECT',role:'giant'});queue.push({type:'ROLE_SELECT',role:'runner'});tick();tick();
const world=model.children[0];const packet=out.filter(x=>x.type==='POSE').at(-1);
assert(packet);close(cg.mMultiply(world.getGlobalMatrix(),packet.head),pose,'runner head round trip');
close(cg.mMultiply(world.getGlobalMatrix(),packet.right),controllerMatrix.right,'runner controller round trip');
assert.ok(Math.abs(packet.head[13]-rules.FLOOR-pose[13]/12)<1e-9,'floor-relative 1:12 eye height');
const initial=packet.head.slice();pose[12]+=.12;tick();const moved=out.filter(x=>x.type==='POSE').at(-1).head;
assert.ok(Math.abs(cg.distance(initial.slice(12,15),moved.slice(12,15))-.01)<1e-9,'12cm tracking gives 1cm world displacement');
remote.push({type:'MOVE_BRIDGE',position:rules.BRIDGE,epoch:0},{type:'BRIDGE_PLACED',epoch:0});tick();
queue.push({type:'TRAVEL',stop:1,epoch:0});tick();tick();
const after=out.filter(x=>x.type==='POSE').at(-1);close(cg.mMultiply(world.getGlobalMatrix(),after.head),pose,'teleport maintains viewpoint');
scene.deinit();console.log('PASS: actual coop scene, elected authority, two role owners, runner camera/head/hands, nonidentity model origin, scale and teleport');
