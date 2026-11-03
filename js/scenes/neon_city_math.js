// Pure city-space rules. XR eye/projection matrices are never modified.
export const SCALE = 12;
export const WAYPOINTS = [
  { name: 'CENTRAL PLAZA', eye: [0, .135, .15] },
  { name: 'HOLO MARKET', eye: [-.22, .135, .105], terminal: 'market' },
  { name: 'REACTOR', eye: [.22, .135, -.07], terminal: 'reactor' },
  { name: 'TRANSIT HUB', eye: [.22, .135, .145], terminal: 'transit' },
];
export const TERMINALS = [
  { id: 'market', name: '01 / HOLO NETWORK', p: [-.22, .09, .05], color: [1,.12,.55] },
  { id: 'reactor', name: '02 / REACTOR', p: [.22, .09, -.125], color: [1,.65,.12] },
  { id: 'transit', name: '03 / TRANSIT', p: [.22, .09, .09], color: [.12,.85,1] },
];
export const add = (a,b) => a.map((v,i)=>v+b[i]);
export const sub = (a,b) => a.map((v,i)=>v-b[i]);
export const distance = (a,b) => Math.hypot(...sub(a,b));
export const rotateY = (p,a) => [Math.cos(a)*p[0]+Math.sin(a)*p[2],p[1],-Math.sin(a)*p[0]+Math.cos(a)*p[2]];
export const toRender = (p,frame) => add(frame.head,rotateY(sub(p,frame.eye).map(v=>v*SCALE),frame.yaw));
export const toCity = (p,frame) => add(frame.eye,rotateY(sub(p,frame.head),-frame.yaw).map(v=>v/SCALE));
export const freshGame = () => ({viewMode:'NORMAL',cityPosition:[0,.78,-.65],power:{market:false,reactor:false,transit:false},currentWaypoint:0,cityRestored:false});
export function activateTerminal(game,id,hand) {
  const terminal=TERMINALS.find(t=>t.id===id);
  if(game.viewMode!=='MINIATURE'||!terminal||game.power[id]||!hand||distance(hand,terminal.p)>.095)return false;
  game.power[id]=true;
  game.cityRestored=Object.values(game.power).every(Boolean);
  return true;
}
