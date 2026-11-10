// Shared tabletop metres. No client ID has a hard-coded role.
export const CHANNEL='cyberpunkCoopV1';
export const FLOOR=.78;
export const STOPS=[[-.24,FLOOR,-.48],[0,FLOOR,-.48],[.24,FLOOR,-.48],[.24,FLOOR,-.72]];
export const BRIDGE=[0,FLOOR,-.48], START=[-.24,FLOOR,-.72];
export const CORE=[.24,FLOOR+.09,-.52], TOWER=[.24,FLOOR+.09,-.77];
export const valid=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
export const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export const fresh=()=>({roles:{giant:null,runner:null},bridge:START.slice(),bridgePlaced:false,coreCollected:false,success:false,stop:0,buildings:[[-.27,FLOOR,-.83],[.05,FLOOR,-.83]],epoch:0,revision:0});
export const roleOf=(s,id)=>Object.keys(s.roles).find(r=>s.roles[r]===String(id));
export function prune(s,ids){for(const r of Object.keys(s.roles))if(s.roles[r]!==null&&!ids.includes(s.roles[r])){s.roles[r]=null;s.revision++;}}
export function apply(s,m,id){
 id=String(id);const role=roleOf(s,id);
 if(m.type==='ROLE_SELECT'&&['giant','runner'].includes(m.role)&&!role&&s.roles[m.role]===null){s.roles[m.role]=id;s.revision++;return true;}
 if(m.type==='LEAVE'&&role){s.roles[role]=null;s.revision++;return true;}
 if(m.epoch!==s.epoch)return false;
 if(m.type==='RESET'&&role){const roles=s.roles,epoch=s.epoch+1,revision=s.revision+1;Object.assign(s,fresh(),{roles,epoch,revision});return true;}
 if(s.roles.giant===null||s.roles.runner===null||s.success)return false;
 let ok=false;
 if(role==='giant'&&m.type==='MOVE_BRIDGE'&&!s.bridgePlaced&&valid(m.position)&&Math.abs(m.position[0])<.4&&m.position[1]>=FLOOR&&m.position[1]<1.5&&m.position[2]>-1&&m.position[2]<-.3){s.bridge=m.position.slice();ok=true;}
 if(role==='giant'&&m.type==='BRIDGE_PLACED'&&!s.bridgePlaced&&distance(s.bridge,BRIDGE)<.065){s.bridge=BRIDGE.slice();s.bridgePlaced=true;ok=true;}
 if(role==='giant'&&m.type==='MOVE_BUILDING'&&[0,1].includes(m.index)&&valid(m.position)&&Math.abs(m.position[0])<.32&&m.position[2]<-.66&&m.position[2]>-.9){s.buildings[m.index]=[m.position[0],FLOOR,m.position[2]];ok=true;}
 if(role==='runner'&&m.type==='TRAVEL'&&Number.isInteger(m.stop)&&m.stop>=0&&m.stop<STOPS.length&&Math.abs(m.stop-s.stop)===1&&(s.bridgePlaced||m.stop===0)){s.stop=m.stop;ok=true;}
 if(role==='runner'&&m.type==='CORE_COLLECTED'&&s.bridgePlaced&&s.stop===2&&valid(m.position)&&distance(m.position,CORE)<.095){s.coreCollected=true;ok=true;}
 if(role==='runner'&&m.type==='TOWER_ACTIVATED'&&s.bridgePlaced&&s.coreCollected&&s.stop===3&&valid(m.position)&&distance(m.position,TOWER)<.095){s.success=true;ok=true;}
 if(ok)s.revision++;return ok;
}
