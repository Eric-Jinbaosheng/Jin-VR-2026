import { TERMINALS, WAYPOINTS } from './neon_city_math.js';
const C={body:[.035,.055,.095],trim:[.075,.11,.17],cyan:[.08,.85,1],pink:[1,.12,.55],gold:[1,.65,.12]};
export function buildCity(root) {
  const lights=[],rings=[],cars=[];
  const box=(p,s,c,parent=root)=>parent.add('cube').move(p).scale(s).color(c).dull();
  const light=(p,s,color,district,parent=root)=>{const node=box(p,s,color,parent);lights.push({node,color,district});return node;};
  const label=(value,p,scale,color=C.cyan,parent=root)=>{
    const n=parent.add().textBox(value,.075).move(p).scale(scale).color(color).dull();
    n.child(0).scale(1,1,.001);return n;
  };
  box([0,-.018,0],[.35,.018,.225],C.body);
  box([0,.001,0],[.344,.003,.219],[.018,.025,.045]);
  const edges=[];
  for(const x of [-.349,.349])edges.push(box([x,-.008,0],[.0015,.005,.224],C.cyan));
  for(const z of [-.224,.224])edges.push(box([0,-.008,z],[.35,.005,.0015],C.cyan));
  // Invisible interaction surface has an invertible matrix for ray intersection.
  const baseHit=root.add('square').move(0,.006,0).turnX(-Math.PI/2).scale(.35,.225,1).opacity(0);
  for(const x of [-.115,.115]) {
    box([x,.005,0],[.024,.001,.215],[.055,.065,.09]);
    for(let z=-.19;z<.21;z+=.04)light([x,.0065,z],[.001,.0005,.009],C.cyan,'transit');
  }
  for(const z of [-.055,.145]) {
    box([0,.005,z],[.337,.001,.022],[.055,.065,.09]);
    light([0,.007,z-.021],[.33,.001,.001],C.gold,'reactor');
  }
  // Ten distinct stepped silhouettes; windows are inexpensive opaque strips.
  const buildings=[[-.28,-.17,.045,.04,.15,'market'],[-.19,-.16,.032,.044,.23,'market'],[-.29,-.045,.042,.03,.105,'market'],[-.30,.14,.027,.04,.17,'market'],[-.17,.19,.032,.025,.11,'market'],[.035,-.17,.04,.036,.19,'reactor'],[.28,-.19,.037,.025,.12,'reactor'],[.30,-.04,.028,.034,.21,'reactor'],[.29,.19,.033,.022,.12,'transit'],[-.045,.20,.033,.02,.12,'transit']];
  buildings.forEach(([x,z,w,d,h,district],i)=>{
    box([x,h/2+.008,z],[w,h/2,d],C.body);
    box([x,h+.014,z],[w*.82,.007,d*.85],C.trim);
    box([x+.01,h+.03,z],[w*.32,.012,d*.45],C.trim);
    const color=i%2?C.cyan:C.pink;
    light([x-w+.002,h/2,z+d+.001],[.001,h/2,.001],color,district);
    for(let y=.03;y<h;y+=.027) {
      light([x,y,z+d+.001],[w*.72,.002,.001],color,district);
      light([x+w+.001,y,z],[.001,.002,d*.65],color,district);
    }
    if(i%3===0){box([x,h+.047,z],[.001,.025,.001],C.trim);light([x,h+.073,z],[.002,.002,.002],C.pink,district);}
  });
  const ads=[['CYBER SHOP',[-.275,.115,-.012],.053,'market',C.pink],['NIGHT / 2099',[-.185,.19,-.114],.05,'market',C.cyan],['TRANSIT',[.29,.1,.214],.045,'transit',C.cyan]];
  for(const [text,p,size,district,color] of ads){box([p[0],p[1],p[2]-.002],[size,.012,.001],C.trim);lights.push({node:label(text,p,size,color),color,district});}
  // Nexus in the back center leaves the plaza and travel routes clear.
  box([0,.015,-.06],[.055,.014,.05],C.trim);
  root.add('tubeY8').move(0,.14,-.06).scale(.024,.13,.024).color(C.body).dull();
  for(const x of [-.019,.019])light([x,.14,-.039],[.002,.12,.001],C.cyan,'all');
  for(let i=0;i<3;i++){
    const pivot=root.add().move(0,.20+i*.035,-.06);
    const ring=pivot.add('ringY').scale(.047-i*.005,.003,.047-i*.005).color(C.cyan).dull();
    rings.push({pivot,ring,y:.20+i*.035,x:0,z:-.06,district:'all'});
  }
  const beacon=root.add('tubeY8').color(C.cyan).dull();
  const crown=root.add('sphere').move(0,.31,-.06).scale(.012).color(1,.1,.06).dull();
  label('N E X U S',[0,.17,-.032],.06);
  // Reactor cage and asymmetric spinning gold hoops.
  box([.22,.025,-.18],[.052,.025,.028],C.trim);
  for(let i=0;i<2;i++){
    const pivot=root.add().move(.22,.074,-.18);
    const ring=pivot.add('ringZ').scale(.035,.035,.002).color(C.gold).dull();
    rings.push({pivot,ring,y:.074,x:.22,z:-.18,district:'reactor',phase:i*Math.PI/2});
  }
  for(let i=0;i<3;i++){
    const car=root.add();box([0,0,0],[.018,.006,.009],C.trim,car);box([0,.008,0],[.01,.004,.007],C.body,car);
    light([0,-.005,.01],[.016,.001,.001],C.cyan,'transit',car);light([-.019,0,0],[.001,.003,.007],C.pink,'transit',car);cars.push(car);
  }
  for(const x of [-.09,.09])for(const z of [-.12,.10]){
    box([x,.032,z],[.001,.028,.001],C.trim);
    light([x,.061,z],[.008,.002,.003],C.cyan,'transit');
  }
  const terminals=TERMINALS.map(t=>{
    box([t.p[0],.039,t.p[2]-.004],[.012,.035,.009],C.trim);
    const screen=root.add('square').move(t.p).scale(.014,.012,1).color(1,.12,.07).dull();
    const text=label(t.name,[t.p[0],.112,t.p[2]+.001],.042,t.color);
    return {...t,screen,text};
  });
  WAYPOINTS.forEach((w,i)=>{
    const [x,,z]=w.eye;
    root.add('ringY').move(x,.009,z).scale(.018,.001,.018).color(C.cyan).dull();
    label(String(i+1).padStart(2,'0'),[x,.011,z],.022).turnX(-Math.PI/2);
  });
  label('NEON CITY 2099 / THE LAST LIGHT',[0,-.015,.226],.28);
  return {baseHit,edges,terminals,update(game,time,hover){
    lights.forEach(({node,color,district})=>{
      const on=district==='all'?game.cityRestored:game.power[district];
      const strength=on?1:.055;node.color(color.map(v=>v*strength));
    });
    rings.forEach(r=>{
      const on=r.district==='all'?game.cityRestored:game.power.reactor;
      r.pivot.identity().move(r.x,r.y,r.z).turnY(on?time*.65+(r.phase||0):r.phase||0).turnX(r.district==='reactor'?.4:0);
      r.ring.color(on?(r.district==='all'?C.cyan:C.gold):[.15,.025,.035]);
    });
    cars.forEach((car,i)=>{
      const a=(game.power.transit?time*.32:0)+i*Math.PI*2/3;
      car.identity().move(.30*Math.cos(a),.16+.012*Math.sin(a*2),.19*Math.sin(a)).turnY(-a);
    });
    beacon.identity();
    if(game.cityRestored)beacon.move(0,.43,-.06).scale(.004+.001*Math.sin(time*3),.14,.004).color(C.cyan);else beacon.scale(0);
    crown.color(game.cityRestored?C.cyan:[.6+.3*Math.sin(time*2),.035,.02]);
    terminals.forEach(t=>t.screen.color(game.power[t.id]?[.15,1,.65]:hover===t.id?[1,.8,.35]:[.65,.05,.025]));
    edges.forEach(e=>e.color(hover==='base'?[1,1,1]:C.cyan));
  }};
}
