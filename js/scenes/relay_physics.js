// Assignment 6: deterministic host-authoritative physics, adapted from bouncing.js.
export const R = .085;
export const LOW = [-1.15, .72, -2.05], HIGH = [1.15, 2.0, -.15];
export const validPoint = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export function freshState() {
 return {phase:'ready', time:90, score:0, goal:8, gravity:.5, speed:.5, balls:[], serial:0};
}
export function launch(s) {
 s.phase='playing'; s.time=90; s.score=0;
 s.balls=Array.from({length:4},(_,i)=>({p:[-.6+i*.4,1.2+i*.14,-1.05],v:[i%2?.45:-.45,.25,.35],touches:[],cool:{},flash:0}));
}
export function step(s,dt,hands,players) {
 if(s.phase!=='playing' || players.length<2) return;
 dt=clamp(dt,0,1/60); s.time=Math.max(0,s.time-dt);
 const speed=.65+s.speed*1.15;
 for(const b of s.balls) {
  b.flash=Math.max(0,b.flash-dt);
  for(const k in b.cool) b.cool[k]=Math.max(0,b.cool[k]-dt);
  for(const h of hands) {
   if(!players.includes(h.id)||!validPoint(h.p)) continue;
   const d=b.p.map((x,k)=>x-h.p[k]), len=Math.hypot(...d);
   if(len<R+.10 && !(b.cool[h.id]>0)) {
    const n=len>.0001?d.map(x=>x/len):[0,1,0];
    b.p=h.p.map((x,k)=>x+n[k]*(R+.105));
    const hv=validPoint(h.v)?h.v:[0,0,0];
    b.v=n.map((x,k)=>x*.9+clamp(hv[k],-2,2)*.65);
    b.v[1]=Math.max(.3,b.v[1]);
    if(!b.touches.includes(h.id)) b.touches.push(h.id);
    // A charged orb gets a gentle goalward assist; players still aim its x/y.
    if(b.touches.length>=2) b.v[2]=Math.min(-.65,b.v[2]);
    b.cool[h.id]=.3; b.flash=.22;
   }
  }
  b.v[1]-=(.1+s.gravity*.75)*dt;
  for(let k=0;k<3;k++) {b.v[k]*=Math.exp(-.08*dt); b.p[k]+=clamp(b.v[k],-3,3)*dt*speed;}
  if(b.p[2]<=LOW[2]+R && Math.abs(b.p[0])<.62 && b.p[1]>.85 && b.p[1]<1.85 && b.touches.length>=2) {
   s.score++; b.p=[0,1.45,-.85]; b.v=[.5*(s.score%2?1:-1),.4,.3]; b.touches=[]; b.cool={};
  }
  for(let k=0;k<3;k++) {
   if(b.p[k]<LOW[k]+R) {b.p[k]=LOW[k]+R;b.v[k]=Math.abs(b.v[k])*.96;}
   if(b.p[k]>HIGH[k]-R) {b.p[k]=HIGH[k]-R;b.v[k]=-Math.abs(b.v[k])*.96;}
  }
 }
 for(let i=0;i<s.balls.length;i++) for(let j=i+1;j<s.balls.length;j++) {
  const a=s.balls[i],b=s.balls[j],d=b.p.map((x,k)=>x-a.p[k]),l=Math.hypot(...d);
  if(l>0 && l<2*R) {
   const n=d.map(x=>x/l),rel=a.v.reduce((v,x,k)=>v+(x-b.v[k])*n[k],0);
   for(let k=0;k<3;k++) {a.p[k]-=n[k]*(2*R-l)/2;b.p[k]+=n[k]*(2*R-l)/2;if(rel>0){a.v[k]-=rel*n[k];b.v[k]+=rel*n[k];}}
  }
 }
 if(s.score>=s.goal) s.phase='won'; else if(s.time<=0) s.phase='over';
}
