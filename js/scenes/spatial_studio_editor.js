import { BOARD, BUILDINGS, COLORS, mm } from './spatial_studio_state.js';

export function makeEditor(actions, signal) {
   const ui = document.createElement('section');
   ui.className = 'spatial-studio';
   ui.innerHTML = `
      <style>
         .spatial-studio{position:fixed;left:16px;top:16px;z-index:10000;width:min(320px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:16px;border:1px solid #314253;border-radius:14px;background:#0b1421f7;color:#e7f0fb;font:13px/1.45 system-ui;box-shadow:0 12px 40px #0007;color-scheme:dark}
         .spatial-studio h1{font-size:19px;line-height:1.15;margin:0 0 5px}
         .spatial-studio a{color:#78e9ff}
         .spatial-studio label{display:grid;gap:3px;color:#aebdd0}
         .spatial-studio input,.spatial-studio button{min-width:0;font:inherit;color:inherit;background:#152437;border:1px solid #394d62;border-radius:5px;padding:5px 7px;box-sizing:border-box}
         .spatial-studio input{width:100%}
         .spatial-studio input[type=color]{height:31px;padding:3px}
         .spatial-studio button{cursor:pointer}
         .spatial-studio button:disabled{opacity:.55;cursor:default}
         .spatial-studio :focus-visible{outline:2px solid #a4efff;outline-offset:2px}
         .spatial-studio .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
         .spatial-studio .fields{display:grid;gap:7px;margin:10px 0}
         .spatial-studio .buttons{display:flex;gap:6px;flex-wrap:wrap}
         .spatial-studio .plan{position:relative;box-sizing:border-box;margin:10px 0;aspect-ratio:14 / 9;border:1px solid #425870;border-radius:6px;background:linear-gradient(#29405770 1px,transparent 1px),linear-gradient(90deg,#29405770 1px,transparent 1px),#101e2d;background-size:10% 10%;touch-action:none;user-select:none}
         .spatial-studio .lot{position:absolute;transform:translate(-50%,-50%);border:1px solid var(--lot);border-radius:3px;background:color-mix(in srgb,var(--lot) 22%,#101e2d);color:#fff;text-shadow:0 1px 2px #000;padding:0;font-weight:650;cursor:grab}
         .spatial-studio .lot[aria-pressed=true]{outline:2px solid #fff;z-index:1}
         .spatial-studio .status{margin:3px 0 0;color:#96e1ee;min-height:1.45em}
         .spatial-studio details,.spatial-studio .keys{margin-top:8px;color:#aebdd0}
         .spatial-studio summary{cursor:pointer}
         @media(max-width:620px){.spatial-studio{top:auto;bottom:12px;left:12px;max-height:62dvh}}
      </style>
      <h1>Spatial Design Studio</h1>
      <div>Neon City <span aria-hidden="true">·</span> <a data-viewer target="_blank" rel="noopener">Open headset view ↗</a></div>
      <div class="plan" role="group" aria-label="Building plan. Click to select or drag to move."></div>
      <div class="fields">
         <label>Building name<input name="name" maxlength="28"></label>
         <label>Design note<input name="note" maxlength="72" placeholder="Add a spatial annotation"></label>
         <div class="grid">
            <label>X (mm)<input name="x" type="number" step="1"></label>
            <label>Z (mm)<input name="z" type="number" step="1"></label>
            <label>Height (mm)<input name="height" type="number" min="50" max="340" step="1"></label>
         </div>
         <label>Accent color<input name="color" type="color"></label>
      </div>
      <div class="buttons">
         <button data-save>Save</button><button data-restore>Restore</button><button data-gaze disabled>Pick gaze</button>
      </div>
      <p class="status" data-status role="status"></p>
      <div class="keys">0–9 select · arrows move · + / − resize · C color · S save · G pick gaze</div>
      <details><summary>Headset placement</summary>
         <label>Desk height (cm)<input name="desk" type="number" min="50" max="120" step="1"></label>
         <button data-place>Place in front of headset [P]</button>
         <p>In mixed reality, face the desk and look toward its center, then press P on this computer.</p>
      </details>`;
   document.body.append(ui);

   const $ = selector => ui.querySelector(selector);
   const viewer = new URL(location.href);
   viewer.searchParams.set('studio', 'viewer');
   $('[data-viewer]').href = viewer.href;
   const plan = $('.plan');
   const input = Object.fromEntries([...ui.querySelectorAll('input')].map(el => [el.name, el]));
   const lots = BUILDINGS.map((b, index) => {
      const lot = document.createElement('button');
      lot.className = 'lot';
      lot.dataset.index = index;
      lot.textContent = b.key;
      lot.style.width = 100 * b.w / BOARD.x + '%';
      lot.style.height = 100 * b.d / BOARD.z + '%';
      lot.onclick = () => actions.select(index);
      plan.append(lot);
      return lot;
   });

   const listen = (target, type, handler, options) => target.addEventListener(type, handler, { signal, ...options });
   listen(plan, 'pointerdown', event => {
      const lot = event.target.closest('[data-index]');
      if (!lot || event.button !== 0) return;
      event.preventDefault();
      lot.focus({ preventScroll: true });
      const index = Number(lot.dataset.index);
      const { x, z } = actions.state().buildings[index];
      plan.setPointerCapture(event.pointerId);
      actions.select(index);
      drag = { index, id: event.pointerId, startX: event.clientX, startY: event.clientY, x, z };
   });
   let drag;
   listen(plan, 'pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const { width, height } = plan.getBoundingClientRect();
      actions.edit(drag.index, {
         x: drag.x + (event.clientX - drag.startX) * 2 * BOARD.x / width,
         z: drag.z + (event.clientY - drag.startY) * 2 * BOARD.z / height,
      });
   });
   for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      listen(plan, event, e => { if (drag?.id === e.pointerId) drag = null; });

   for (const key of ['name', 'note', 'color'])
      listen(input[key], 'input', () => actions.edit(actions.state().selected, { [key]: input[key].value }));
   for (const key of ['x', 'z', 'height', 'desk']) {
      listen(input[key], 'change', () => {
         const amount = input[key].valueAsNumber;
         if (!Number.isFinite(amount)) {
            input[key].value = key === 'desk' ? Math.round(actions.state().desk * 100) :
               mm(actions.state().buildings[actions.state().selected][key]);
            return;
         }
         if (key === 'desk') {
            actions.desk(amount / 100);
            input[key].value = Math.round(actions.state().desk * 100);
         } else {
            const index = actions.state().selected;
            actions.edit(index, { [key]: amount / 1000 });
            input[key].value = mm(actions.state().buildings[index][key]);
         }
      });
   }

   $('[data-save]').onclick = actions.save;
   $('[data-restore]').onclick = actions.restore;
   $('[data-gaze]').onclick = actions.gaze;
   $('[data-place]').onclick = actions.place;

   // Stop course navigation handlers while editing fields, leaving native input behavior intact.
   for (const type of ['keydown', 'keyup'])
      listen(ui, type, e => e.stopPropagation(), { capture: false });

   listen(document, 'keydown', e => {
      if (e.target.closest?.('input,textarea,select,[contenteditable]') ||
          e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
      const { selected, buildings } = actions.state();
      const index = BUILDINGS.findIndex(b => b.key === e.key);
      const b = buildings[selected];
      const step = e.shiftKey ? .025 : .005;
      const repeatable = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(e.key);
      if (index >= 0) { if (!e.repeat) actions.select(index); }
      else if (repeatable) {
         const changes = {
            ArrowLeft: { x: b.x - step }, ArrowRight: { x: b.x + step },
            ArrowUp: { z: b.z - step }, ArrowDown: { z: b.z + step },
            '+': { height: b.height + step }, '=': { height: b.height + step }, '-': { height: b.height - step },
         };
         actions.edit(selected, changes[e.key]);
      } else {
         const shortcut = {
            c: () => actions.edit(selected, { color: COLORS[(COLORS.indexOf(b.color) + 1) % COLORS.length] }),
            s: actions.save, g: actions.gaze, p: actions.place,
         }[e.key.toLowerCase()];
         if (!shortcut) return;
         if (!e.repeat) shortcut();
      }
      e.preventDefault();
      e.stopImmediatePropagation();
   }, { capture: true });

   let lastSelected = -1;
   return {
      node: ui,
      status: message => { $('[data-status]').textContent = message; },
      gaze: value => { $('[data-gaze]').disabled = !value; },
      render(design) {
         const { selected, buildings } = design;
         for (const [i, lot] of lots.entries()) {
            const b = buildings[i];
            lot.title = b.name || BUILDINGS[i].name;
            lot.setAttribute('aria-label', `${BUILDINGS[i].key} ${lot.title}`);
            lot.setAttribute('aria-pressed', String(i === selected));
            lot.style.left = 50 * (1 + b.x / BOARD.x) + '%';
            lot.style.top = 50 * (1 + b.z / BOARD.z) + '%';
            lot.style.setProperty('--lot', b.color);
         }
         const b = buildings[selected];
         for (const key of Object.keys(input)) {
            if (document.activeElement === input[key] && selected === lastSelected) continue;
            input[key].value = key === 'desk' ? Math.round(design.desk * 100) :
               typeof b[key] === 'number' ? mm(b[key]) : b[key];
         }
         lastSelected = selected;
      },
   };
}
