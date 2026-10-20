/* HW5 Part 1: AI describes geometry; validated JSON becomes Clay primitives. */
import { AIQuery } from '../util/aiquery.js';
import { ControllerBeam } from '../render/core/controllerInput.js';
import { WORKCELL, requestWorkcell, countSolidOverlaps } from './ai_workcell_data.js';

let cleanup = () => {};

export const init = async model => {
   const ai = new AIQuery({ timeout: 90000 });
   const beam = new ControllerBeam(model, 'right');
   const generatedRoot = model.add();
   let alive = true, busy = false, count = 20, hovering = null;
   let description = 'Generate a robot warehouse with 3 shelves and 10 boxes';

   // A physical deck gives generated objects an unambiguous height reference.
   model.add('cube').move(0, .79, -1).scale(1.32, .05, .72).color(.10, .16, .19).dull();
   model.add('cube').move(0, .837, -1).scale(1.3, .008, .7).color(.13, .25, .29).dull();
   for (const x of [-1.16, 1.16])
      for (const z of [-1.56, -.44])
         model.add('cube').move(x, .45, z).scale(.055, .3, .055).color(.09, .13, .15).dull();

   const flatText = (value, height, color) => {
      const node = model.add().textBox(value, height).color(color).dull();
      node.child(0).scale(1, 1, .001);
      return node;
   };
   model.add('square').move(0, 1.65, -1.75).scale(.8, .29, 1).color(.012, .035, .05).dull();
   const title = flatText('AI WORKCELL BUILDER', .07, [.35, .92, 1]);
   const promptText = flatText('ROBOT WAREHOUSE / 3 SHELVES / 10 BOXES', .039, [1, 1, 1]);
   const statusText = flatText('SELECT GENERATE TO BUILD GEOMETRY', .039, [.42, 1, .65]);
   const countText = flatText('20 OBJECTS', .043, [1, .87, .4]);
   const buttons = [
      { id: 'generate', x: -.57, label: 'GENERATE' },
      { id: 'clear', x: -.19, label: 'CLEAR' },
      { id: 'count', x: .19, label: 'COUNT' },
      { id: 'preset', x: .57, label: 'PRESET' }
   ].map(button => ({ ...button,
      node: model.add('square').move(button.x, 1.39, -1.74).scale(.17, .055, 1).color(.07, .48, .62).dull(),
      text: flatText(button.label, .045, [1, 1, 1])
   }));

   const desktop = document.createElement('section');
   desktop.setAttribute('aria-label', 'HW5 AI Workcell controls');
   desktop.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:10000;width:340px;max-height:75vh;overflow:auto;padding:14px;background:#102432ee;color:white;border:1px solid #5bbbd1;border-radius:10px;font:14px Arial,sans-serif';
   desktop.innerHTML = '<strong>AI WORKCELL BUILDER</strong><p>Describe a workcell made from simple shapes.</p><textarea data-prompt rows="3" maxlength="180" style="box-sizing:border-box;width:100%"></textarea><div style="display:flex;gap:5px;flex-wrap:wrap;margin:8px 0"><label>Objects <select data-count><option>5</option><option selected>20</option><option>50</option></select></label><button data-action="generate">Generate Scene</button><button data-action="clear">Clear Scene</button><button data-action="preset">Next preset</button></div><p data-status role="status"></p><details><summary>Validated AI JSON</summary><pre data-json style="white-space:pre-wrap;max-height:200px;overflow:auto"></pre></details>';
   document.body.appendChild(desktop);
   const input = desktop.querySelector('[data-prompt]');
   const countInput = desktop.querySelector('[data-count]');
   const status = desktop.querySelector('[data-status]');
   const json = desktop.querySelector('[data-json]');
   input.value = description;
   const presets = [
      'Generate a robot warehouse with 3 shelves and 10 boxes',
      'Create a small robot factory with workbenches, conveyors, crates and a target zone',
      'Create a robot laboratory with equipment racks, obstacles and colored goal areas'
   ];
   let presetIndex = 0;

   const setStatus = (message, error = false) => {
      status.textContent = message;
      statusText.textBox(message.toUpperCase().slice(0, 58), .039).color(error ? [1, .37, .3] : [.42, 1, .65]);
   };
   const clear = () => {
      while (generatedRoot.nChildren()) generatedRoot.remove(0);
      json.textContent = '';
      title.textBox('AI WORKCELL BUILDER', .07);
      setStatus('Scene cleared. Generate a new workcell.');
   };
   const generate = async () => {
      if (!alive || busy) return;
      description = input.value.trim().slice(0, 180);
      if (!description) { setStatus('Enter a workcell description.', true); return; }
      busy = true;
      setStatus(`Asking AI for ${count} geometry objects...`);
      try {
         const data = await requestWorkcell(prompt => ai.askAIJson(prompt), description, count,
            progress => { if (alive) setStatus(progress); });
         if (!alive) return;
         // Keep the previous scene if the response fails validation.
         while (generatedRoot.nChildren()) generatedRoot.remove(0);
         for (const item of data.objects)
            generatedRoot.add(item.shape).move(item.position).scale(item.scale).color(item.color).dull();
         title.textBox(data.title.toUpperCase(), .07);
         json.textContent = JSON.stringify(data, null, 2);
         const overlaps = countSolidOverlaps(data.objects);
         const expectedBoxes = Number(description.match(/(\d+)\s*(?:boxes|box|crates|crate)\b/i)?.[1] || 0);
         const actualBoxes = data.objects.filter(item => /box|crate/i.test(item.name)).length;
         const boxReport = expectedBoxes ? `; boxes ${actualBoxes}/${expectedBoxes}` : '';
         setStatus(`Rendered ${data.objects.length} AI objects${boxReport}; ${overlaps} possible overlaps; ${data.adjustments} adjusted.`);
      } catch (error) {
         if (alive) setStatus(`Generation failed: ${String(error.message).slice(0, 100)}`, true);
         console.error('[AI Workcell] Generation failed:', error);
      } finally { busy = false; }
   };
   const action = id => {
      if (id === 'generate') generate();
      if (id === 'clear') clear();
      if (id === 'count') {
         count = WORKCELL.counts[(WORKCELL.counts.indexOf(count) + 1) % WORKCELL.counts.length];
         countInput.value = String(count);
         countText.textBox(`${count} OBJECTS`, .043);
      }
      if (id === 'preset') {
         presetIndex = (presetIndex + 1) % presets.length;
         description = presets[presetIndex];
         input.value = description;
         promptText.textBox(description.toUpperCase().slice(0, 54), .039);
         setStatus('Preset selected. Press Generate.');
      }
   };
   desktop.querySelectorAll('[data-action]').forEach(button => button.onclick = () => action(button.dataset.action));
   countInput.onchange = () => {
      count = Number(countInput.value);
      countText.textBox(`${count} OBJECTS`, .043);
   };
   input.oninput = () => promptText.textBox(input.value.trim().toUpperCase().slice(0, 54), .039);
   inputEvents.onPress = hand => { if (hand === 'right' && hovering) action(hovering); };

   cleanup = () => {
      alive = false;
      desktop.remove();
      inputEvents.onPress = () => {};
   };
   model.animate(() => {
      if (!alive) return;
      beam.update();
      hovering = null;
      for (const button of buttons) {
         const hit = beam.hitRect(button.node.getGlobalMatrix()) !== null;
         if (hit) hovering = button.id;
         button.node.color(hit ? [1, .8, .25] : [.07, .48, .62]);
         button.text.identity().move(button.x, 1.39, -1.73).scale(.22);
      }
      title.identity().move(0, 1.84, -1.73).scale(.32);
      promptText.identity().move(0, 1.73, -1.73).scale(.28);
      statusText.identity().move(0, 1.62, -1.73).scale(.27);
      countText.identity().move(0, 1.51, -1.73).scale(.3);
   });
};

export const deinit = () => cleanup();
export const onReload = async (_scene, model) => { cleanup(); model.clear(); await init(model); };
