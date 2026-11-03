import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const src=await fs.readFile(new URL('../js/scenes/neon_city_math.js',import.meta.url),'utf8');
const {SCALE,WAYPOINTS,TERMINALS,toRender,toCity,freshGame,activateTerminal,distance,trackingFrame,rotateY}=await import('data:text/javascript,'+encodeURIComponent(src));
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
 assert.equal(activateTerminal(g,w.terminal,[w.eye[0],.135,w.eye[2]]),true,'waypoint is within reach');
 assert.equal(activateTerminal(g,w.terminal,[w.eye[0],.135,w.eye[2]]),false,'idempotent activation');
}
assert.equal(g.cityRestored,true);
g.viewMode='NORMAL';g.cityPosition=[.2,.78,-.4];g.viewMode='MINIATURE';
assert.ok(Object.values(g.power).every(Boolean),'returning and moving city preserve power');
assert.equal(freshGame().cityRestored,false);
console.log('PASS: rotated coordinate round trips, 1:12 tracking, eye anchoring, reach rejection, all 3 terminals, mode persistence, restart');

// Real height, crouching and both controllers retain their common floor origin.
for(const eyeHeight of [1.15,1.6,1.7238,1.9]){
 const head=[.7,eyeHeight,-.4];
 const frame=trackingFrame(head,.8,WAYPOINTS[0]);
 const avatar=toCity(head,frame);
 assert.ok(Math.abs(avatar[1]-frame.eye[1]-eyeHeight/12)<1e-12,'height is absolute /12, not fixed');
 assert.ok(Math.abs(toCity([head[0],eyeHeight-.36,head[2]],frame)[1]-frame.eye[1]-(eyeHeight-.36)/12)<1e-12,'crouch maintains ground reference');
 const hand=[.9,eyeHeight-.4,-.7];
 assert.ok(Math.abs(distance(toCity(hand,frame),avatar)-distance(hand,head)/12)<1e-12,'hand/head separation');
}
const sixFoot=trackingFrame([0,1.7238,0],0,WAYPOINTS[0]);
assert.ok(Math.abs(toCity([0,1.7238,0],sixFoot)[1]-sixFoot.eye[1]+.105/12-.1524)<1e-12,'6ft crown with 10.5cm eye-to-crown estimate is 6in');
// Walking and turning before switching must not snap to a waypoint or reset yaw.
let frame=trackingFrame([.3,1.7,-.4],.6,WAYPOINTS[0]);
const movedHead=[.54,1.42,-.7],look=[.2,-.3,-.9];
const avatarEye=toCity(movedHead,frame);
assert.ok(distance(avatarEye,WAYPOINTS[0].eye)>.1);
assert.ok(distance(toRender(avatarEye,frame),movedHead)<1e-12,'entry is current avatar eye');
const avatarLook=rotateY(look,-frame.yaw);
assert.ok(distance(rotateY(avatarLook,frame.yaw),look)<1e-12,'entry preserves pitch and yaw');
// Teleport is the only operation that changes the frame; return keeps that frame.
frame=trackingFrame(movedHead,-.4,WAYPOINTS[2]);
const destination=toCity(movedHead,frame);
assert.ok(Math.abs(destination[0]-WAYPOINTS[2].eye[0])<1e-12);
assert.ok(Math.abs(destination[1]-frame.eye[1]-movedHead[1]/12)<1e-12);
const laterHead=[.6,1.3,-.6];
assert.ok(distance(toRender(toCity(laterHead,frame),frame),laterHead)<1e-12,'return/re-entry remains continuous after teleport');
console.log('PASS: multiple user heights, crouching, hands, six-foot example, current-eye entry, heading continuity and teleport height');
