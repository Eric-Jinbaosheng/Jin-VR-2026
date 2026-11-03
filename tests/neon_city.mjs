import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const src=await fs.readFile(new URL('../js/scenes/neon_city_math.js',import.meta.url),'utf8');
const {SCALE,WAYPOINTS,TERMINALS,toRender,toCity,freshGame,activateTerminal,distance}=await import('data:text/javascript,'+encodeURIComponent(src));
for(const yaw of [0,.7,-2.3])for(const w of WAYPOINTS){
 const frame={head:[.4,1.72,-.8],eye:w.eye,yaw};
 for(const p of [[0,0,0],[.12,.09,-.15],w.eye])assert.ok(distance(toCity(toRender(p,frame),frame),p)<1e-10);
 assert.ok(distance(toRender(w.eye,frame),frame.head)<1e-10);
 const moved=toCity([frame.head[0]+.12,frame.head[1],frame.head[2]],frame);
 assert.ok(Math.abs(distance(moved,w.eye)-.01)<1e-10,'12 cm of headset motion = 1 cm of city motion');
 assert.ok(Math.abs(distance(toRender([0,0,0],frame),toRender([1,0,0],frame))-SCALE)<1e-10);
}
const g=freshGame();
assert.equal(activateTerminal(g,'market',TERMINALS[0].p),false,'normal mode cannot activate');
g.viewMode='MINIATURE';
assert.equal(activateTerminal(g,'invalid',[0,0,0]),false);
assert.equal(activateTerminal(g,'market',[0,0,0]),false,'reject remote hand');
for(const w of WAYPOINTS.slice(1)){
 assert.equal(activateTerminal(g,w.terminal,w.eye),true,'waypoint is within reach');
 assert.equal(activateTerminal(g,w.terminal,w.eye),false,'idempotent activation');
}
assert.equal(g.cityRestored,true);
g.viewMode='NORMAL';g.cityPosition=[.2,.78,-.4];g.viewMode='MINIATURE';
assert.ok(Object.values(g.power).every(Boolean),'returning and moving city preserve power');
assert.equal(freshGame().cityRestored,false);
console.log('PASS: rotated coordinate round trips, 1:12 tracking, eye anchoring, reach rejection, all 3 terminals, mode persistence, restart');
