import * as cg from '../render/core/cg.js';
import { buildCity } from './neon_city_buildings.js';
import { makeEditor } from './spatial_studio_editor.js';
import { BUILDINGS, clamp, cleanBuilding, initialDesign, mm, pickBuilding, readDesign } from './spatial_studio_state.js';

const DESIGN = 'neonSpatialStudioDesign';
const GAZE = 'neonSpatialStudioGaze';
const SAVE_KEY = 'neon-spatial-studio-design-v1';
const rgb = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255);
let cleanup = () => {};

export const deinit = () => cleanup();
export const init = async model => {
   model._spatialStudioCleanup?.();
   const controller = new AbortController();
   const mode = new URLSearchParams(location.search).get('studio');
   const isEditor = mode === 'editor' || (mode !== 'viewer' && !/OculusBrowser|Quest/i.test(navigator.userAgent));
   const source = Math.random().toString(36).slice(2);
   const root = model.add();
   const city = buildCity(root, { studio: true });
   const markers = root.add();
   const outline = markers.add();
   // A floor rectangle follows the editable building footprint.
   for (const sign of [-1, 1]) {
      outline.add('cube').move(sign,0,0).scale(.045,1,1.04).dull();
      outline.add('cube').move(0,0,sign).scale(1.04,1,.055).dull();
   }
   const gazeMark = markers.add('ringY').color(1,.72,.26).dull().scale(0);
   const panel = root.add();
   const placard = document.createElement('canvas');
   placard.width = 768;
   placard.height = 256;
   placard._animate = true;
   const ink = placard.getContext('2d');
   panel.add('square').scale(.183,.061,1).setTxtr(placard).dull();
   const leader = root.add('tubeZ').color(.35,.85,1).dull();

   let design = initialDesign();
   let editor, viewer;
   let revision = 0;
   let placement = 0;
   let lastPublish = -Infinity;
   let lastGaze = -Infinity;
   let received = null;
   let rendered = null;
   let renderedXR = null;
   let panelHeight = 0;
   let anchoredPlacement = null;
   let anchoredDesk = null;
   let gaze = null;
   let candidate = null;
   let candidateAt = 0;
   let lastDesignAt = -Infinity;
   let lastRemoteGazeAt = -Infinity;
   let remoteGaze = null;
   let receivedGaze = null;
   let socketOpen = false;
   let message = '';

   const status = value => { message = value; editor?.status(value); };
   function change(next) {
      design = next;
      revision++;
      editor?.render(design);
   }
   const actions = {
      state: () => design,
      select: index => { if (index !== design.selected) change({ ...design, selected: index }); },
      edit(index, patch) {
         const previous = design.buildings[index];
         const building = cleanBuilding(index, { ...previous, ...patch });
         if (Object.keys(building).every(key => building[key] === previous[key])) return;
         const buildings = design.buildings.slice();
         buildings[index] = building;
         change({ ...design, buildings });
      },
      desk: height => change({ ...design, desk: clamp(height, .5, 1.2) }),
      save() {
         try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(design));
            status('Design saved in this browser.');
         } catch { status('This browser could not save the design.'); }
      },
      restore() {
         try {
            const saved = readDesign(JSON.parse(localStorage.getItem(SAVE_KEY)));
            if (!saved) { status('No saved design in this browser.'); return; }
            change(saved);
            status('Saved design restored.');
         } catch { status('The saved design could not be read.'); }
      },
      gaze() {
         if (performance.now() - lastRemoteGazeAt > 1600 || remoteGaze === null) {
            status('Look at a building in the headset first.');
            return;
         }
         actions.select(remoteGaze);
         status(`Headset selected building ${BUILDINGS[remoteGaze].key}.`);
      },
      place() {
         placement++;
         status('Placement sent. Keep facing the desk.');
      },
   };

   if (isEditor) {
      editor = makeEditor(actions, controller.signal);
      editor.render(design);
   } else {
      viewer = document.createElement('aside');
      viewer.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:10000;max-width:calc(100vw - 32px);box-sizing:border-box;padding:12px 16px;border:1px solid #40566a;border-radius:10px;color:#dfedfa;background:#101c2bee;font:14px/1.45 system-ui';
      viewer.setAttribute('role', 'status');
      document.body.append(viewer);
   }

   // Use the course WebSocket global broadcast from kbdEvents2. The editor is
   // authoritative and sends a heartbeat so receivers can join after an edit.
   // Saving is explicit and local, independent of the course server's global storage.
   function broadcast(key, value) {
      window[key] = value;
      server.broadcastGlobal(key);
   }

   function position(head, xr) {
      const yaw = Math.atan2(head[8], head[10]);
      const sin = Math.sin(yaw), cos = Math.cos(yaw);
      const drop = head[13] - design.desk;
      const reach = xr && head[9] > .15
         ? clamp(drop * Math.hypot(head[8], head[10]) / head[9], .65, 1.40)
         : (xr ? .90 : 1.13);
      const right = xr ? 0 : (editor && innerWidth > 620 ? .34 : 0);
      const height = xr ? design.desk + .036 : head[13] - .27;
      root.identity().move(head[12] - sin * reach + cos * right, height,
                           head[14] - cos * reach - sin * right).turnY(yaw);
      if (!xr) root.turnX(.38).turnY(-.19).scale(innerWidth > 620 ? 1.50 : 1);
   }

   function renderDesign() {
      design.buildings.forEach((b, index) => {
         const {group, accents} = city.buildings[index];
         group.identity().move(b.x,0,b.z).scale(1,b.height / BUILDINGS[index].h,1);
         const color = rgb(b.color);
         accents.forEach(accent => accent.color(color));
      });
      const index = design.selected;
      const b = design.buildings[index];
      const {w, d, key} = BUILDINGS[index];
      outline.identity().move(b.x,.011,b.z).scale(w + .005,.0014,d + .005).color(.9,.99,1);
      const roof = (.042 + BUILDINGS[index].h) * b.height / BUILDINGS[index].h;
      const peak = index % 3 === 0 ? roof + .035 * b.height / BUILDINGS[index].h : roof;
      panelHeight = peak + .109;
      leader.identity().link([b.x,peak + .006,b.z], [b.x,panelHeight - .061,b.z], .001);

      ink.fillStyle = '#0d1c2b';
      ink.fillRect(0, 0, 768, 256);
      ink.fillStyle = b.color;
      ink.fillRect(0, 0, 10, 256);
      ink.font = '600 39px system-ui';
      ink.fillStyle = '#f2f7ff';
      ink.fillText(`${key}   ${b.name || 'Untitled building'}`, 40, 59, 685);
      ink.font = '25px monospace';
      ink.fillStyle = '#a8c7df';
      ink.fillText(`H ${mm(b.height)} mm   /   X ${mm(b.x)}   Z ${mm(b.z)}`, 40, 103);

      ink.font = '28px system-ui';
      ink.fillStyle = '#deebf5';
      // Measure actual glyphs so long words and IME input can wrap.
      const lines = [''];
      for (const glyph of b.note) {
         const last = lines.length - 1;
         if (ink.measureText(lines[last] + glyph).width > 688) lines.push(glyph.trimStart());
         else lines[last] += glyph;
      }
      lines.slice(0, 3).forEach((line, i) => ink.fillText(line, 40, 150 + i * 36));

   }

   const previousInteract = window.interactMode;
   if (isEditor) window.interactMode = 4;
   cleanup = () => {
      controller.abort();
      editor?.node.remove();
      viewer?.remove();
      if (isEditor && window.interactMode === 4) window.interactMode = previousInteract;
   };
   model._spatialStudioCleanup = cleanup;

   model.animate(() => {
      if (controller.signal.aborted) return;
      const now = performance.now();
      const xr = !!window.isXR?.();
      const open = server.socket?.readyState === 1;
      if (isEditor) {
         const packet = window[GAZE];
         if (packet !== receivedGaze) {
            receivedGaze = packet;
            if (packet?.target === source) {
               lastRemoteGazeAt = now;
               remoteGaze = Number.isInteger(packet.index) && BUILDINGS[packet.index] ? packet.index : null;
            }
         }
         editor.gaze(now - lastRemoteGazeAt < 1600 && remoteGaze !== null);
         if (open !== socketOpen || !message) status(open ? 'Connected · desktop editor' : 'Offline · local edits available');
         if (open && (revision !== window[DESIGN]?.revision || source !== window[DESIGN]?.source ||
                      placement !== window[DESIGN]?.placement || now - lastPublish >= 500) &&
                     (now - lastPublish >= 30 || !socketOpen)) {
            broadcast(DESIGN, { source, revision, placement, design });
            lastPublish = now;
         }
      } else {
         const packet = window[DESIGN];
         if (packet && packet !== received) {
            lastDesignAt = now;
            if (packet.source !== received?.source || packet.revision !== received?.revision)
               design = readDesign(packet.design) || design;
            if (packet.source === received?.source && packet.placement !== received?.placement)
               placement++;
            received = packet;
         }
         const label = open && now - lastDesignAt < 1800
            ? 'Live from desktop · Enter AR to inspect and aim at buildings.'
            : 'Waiting for the desktop editor on this server.';
         if (viewer.textContent !== label) viewer.textContent = label;
      }
      socketOpen = open;
      if (editor && editor.node.hidden !== xr) editor.node.hidden = xr;
      if (viewer && viewer.hidden !== xr) viewer.hidden = xr;

      const pose = clay.pose;
      if (!pose?.transform) return;
      const head = cg.mMultiply(cg.mInverse(model.getGlobalMatrix()), pose.transform.matrix);
      if (renderedXR !== xr || anchoredPlacement !== placement || anchoredDesk !== design.desk) {
         position(head, xr);
         renderedXR = xr;
         anchoredPlacement = placement;
         anchoredDesk = design.desk;
      }
      if (rendered !== design) {
         renderDesign();
         rendered = design;
      }
      const b = design.buildings[design.selected];
      const localHead = cg.mMultiply(cg.mInverse(root.getMatrix()), head);
      panel.identity().move(b.x,panelHeight,b.z)
         .turnY(Math.atan2(localHead[12] - b.x, localHead[14] - b.z));
      if (!isEditor && xr) {
         const index = pickBuilding(localHead.slice(12, 15), localHead.slice(8, 11).map(v => -v), design.buildings);
         if (index !== candidate) { candidate = index; candidateAt = now; }
         if (candidate === null || now - candidateAt >= 250) gaze = candidate;
         if (gaze !== null) {
            const b = design.buildings[gaze];
            gazeMark.identity().move(b.x,.014,b.z)
               .scale(BUILDINGS[gaze].w + .013,.002,BUILDINGS[gaze].d + .013);
         } else gazeMark.identity().scale(0);
      } else {
         gaze = candidate = null;
         gazeMark.identity().scale(0);
      }
      if (!isEditor && open && received && now - lastDesignAt < 1800 &&
          (xr || now - lastGaze < 1000) && now - lastGaze >= 120) {
         broadcast(GAZE, { target: received.source, index: gaze });
         lastGaze = now;
      }
   });
};
