/* HW5 Part 1: AI describes geometry; validated JSON becomes Clay primitives. */
import { AIQuery } from '../util/aiquery.js';
import { ControllerBeam } from '../render/core/controllerInput.js';
import { WORKCELL, requestWorkcell, countSolidOverlaps } from './ai_workcell_data.js';
import { buildFactoryModule } from './ai_workcell_factory.js';

let cleanup = () => {};

export const init = async model => {
   const ai = new AIQuery({ timeout: 90000 });
   const beam = new ControllerBeam(model, 'right');
   const generatedRoot = model.add();
   let alive = true, busy = false, count = 20, hovering = null;
   let modules = [], selected = -1;
   let description = 'Generate a robot warehouse with 3 shelves and 10 boxes';

   // A miniature factory floor remains visible in the headset's passthrough view.
   model.add('cube').move(0, .79, -1).scale(1.34, .05, .74).color(.07, .12, .16).dull();
   model.add('cube').move(0, .842, -1).scale(1.31, .008, .71).color(.13, .22, .26).dull();
   model.add('cube').move(0, 1.14, -1.86).scale(1.34, .30, .025).color(.045, .09, .13).dull();
   for (let i = -5; i <= 5; i++)
      model.add('cube').move(i * .235, .852, -1).scale(.003, .002, .69).color(.18, .34, .39).dull();
   for (let i = -2; i <= 2; i++)
      model.add('cube').move(0, .852, -1 + i * .235).scale(1.30, .002, .003).color(.18, .34, .39).dull();
   for (let i = 0; i < 16; i++)
      model.add('cube').move(-1.21 + i * .16, .856, -.315)
         .scale(.05, .003, .018).color(i % 2 ? [.08,.11,.13] : [1,.63,.12]).dull();
   for (const x of [-1.27, 1.27]) {
      model.add('cube').move(x, 1.14, -1.83).scale(.025, .30, .025).color(.13,.59,.68).dull();
      model.add('sphere').move(x, 1.46, -1.83).scale(.035).color(.20,.96,.92).dull();
   }
   for (const x of [-1.16, 1.16])
      for (const z of [-1.56, -.44])
         model.add('cube').move(x, .45, z).scale(.055, .3, .055).color(.09, .13, .15).dull();

   const flatText = (value, height, color) => {
      const node = model.add().textBox(value, height).color(color).dull();
      node.child(0).scale(1, 1, .001);
      return node;
   };
   model.add('square').move(0, 1.66, -1.78).scale(.83, .36, 1).color(.012, .035, .05).dull();
   const title = flatText('AI ROBOT FACTORY', .07, [.35, .92, 1]);
   const promptText = flatText('ROBOT WAREHOUSE / 3 SHELVES / 10 BOXES', .039, [1, 1, 1]);
   const statusText = flatText('SELECT GENERATE TO BUILD GEOMETRY', .039, [.42, 1, .65]);
   const countText = flatText('20 MODULES', .043, [1, .87, .4]);
   const detailText = flatText('AI CHOOSES THE FACTORY MODULES', .038, [.68,.88,.95]);
   const buttons = [
      { id: 'generate', x: -.64, label: 'BUILD' },
      { id: 'clear', x: -.32, label: 'CLEAR' },
      { id: 'count', x: 0, label: 'COUNT' },
      { id: 'preset', x: .32, label: 'PRESET' },
      { id: 'inspect', x: .64, label: 'INSPECT' }
   ].map(button => ({ ...button,
      node: model.add('square').move(button.x, 1.33, -1.77).scale(.14, .048, 1).color(.07, .48, .62).dull(),
      text: flatText(button.label, .045, [1, 1, 1])
   }));

   const desktop = document.createElement('section');
   desktop.setAttribute('aria-label', 'HW5 AI Workcell controls');
   desktop.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:10000;width:340px;max-height:75vh;overflow:auto;padding:14px;background:#102432ee;color:white;border:1px solid #5bbbd1;border-radius:10px;font:14px Arial,sans-serif';
   desktop.innerHTML = '<strong>AI ROBOT FACTORY</strong><p>AI places factory modules; each is assembled from simple VR geometry.</p><textarea data-prompt rows="3" maxlength="180" style="box-sizing:border-box;width:100%"></textarea><div style="display:flex;gap:5px;flex-wrap:wrap;margin:8px 0"><label>Modules <select data-count><option>5</option><option selected>20</option><option>50</option></select></label><button data-action="generate">Generate Scene</button><button data-action="clear">Clear Scene</button><button data-action="preset">Next preset</button><button data-action="inspect">Inspect next</button></div><p data-status role="status"></p><div data-modules style="max-height:105px;overflow:auto"></div><details><summary>Validated AI JSON</summary><pre data-json style="white-space:pre-wrap;max-height:200px;overflow:auto"></pre></details>';
   document.body.appendChild(desktop);
   const input = desktop.querySelector('[data-prompt]');
   const countInput = desktop.querySelector('[data-count]');
   const status = desktop.querySelector('[data-status]');
   const json = desktop.querySelector('[data-json]');
   const moduleList = desktop.querySelector('[data-modules]');
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
   const inspect = index => {
      if (!modules.length) return;
      selected = (index + modules.length) % modules.length;
      modules.forEach((module, i) => module.visual.select(i === selected));
      const item = modules[selected].item;
      detailText.textBox(`${selected + 1}/${modules.length} ${item.kind.toUpperCase()}: ${item.name.toUpperCase()}`.slice(0, 55), .038);
      moduleList.querySelectorAll('button').forEach((button, i) => {
         button.style.outline = i === selected ? '2px solid #ffbf39' : '';
      });
   };
   const renderModuleList = () => {
      moduleList.replaceChildren();
      modules.forEach((module, i) => {
         const button = document.createElement('button');
         button.textContent = `${i + 1}. ${module.item.name} (${module.item.kind})`;
         button.style.cssText = 'display:block;width:100%;margin:2px 0;text-align:left;background:#173a48;color:white;border:0;padding:4px';
         button.onclick = () => inspect(i);
         moduleList.appendChild(button);
      });
   };
   const clear = () => {
      while (generatedRoot.nChildren()) generatedRoot.remove(0);
      modules = []; selected = -1;
      moduleList.replaceChildren();
      json.textContent = '';
      title.textBox('AI ROBOT FACTORY', .07);
      detailText.textBox('AI CHOOSES THE FACTORY MODULES', .038);
      setStatus('Scene cleared. Generate a new workcell.');
   };
   const generate = async () => {
      if (!alive || busy) return;
      description = input.value.trim().slice(0, 180);
      if (!description) { setStatus('Enter a workcell description.', true); return; }
      busy = true;
      setStatus(`Asking AI for ${count} factory modules...`);
      try {
         const data = await requestWorkcell(prompt => ai.askAIJson(prompt), description, count,
            progress => { if (alive) setStatus(progress); });
         if (!alive) return;
         // Keep the previous scene if the response fails validation.
         while (generatedRoot.nChildren()) generatedRoot.remove(0);
         modules = data.objects.map((item, i) => ({ item,
            visual: buildFactoryModule(generatedRoot, item, i, count <= 20) }));
         renderModuleList();
         inspect(0);
         title.textBox(data.title.toUpperCase().slice(0, 40), .07);
         json.textContent = JSON.stringify(data, null, 2);
         const overlaps = countSolidOverlaps(data.objects);
         const expectedBoxes = Number(description.match(/(\d+)\s*(?:boxes|box|crates|crate)\b/i)?.[1] || 0);
         const actualBoxes = data.objects.filter(item => /box|crate/i.test(item.name)).length;
         const boxReport = expectedBoxes ? `; boxes ${actualBoxes}/${expectedBoxes}` : '';
         setStatus(`Built ${data.objects.length} AI modules${boxReport}; ${overlaps} possible overlaps; ${data.adjustments} adjusted.`);
      } catch (error) {
         if (alive) setStatus(`Generation failed: ${String(error.message).slice(0, 100)}`, true);
         console.error('[AI Workcell] Generation failed:', error);
      } finally { busy = false; }
   };
   const action = id => {
      if (id === 'generate') generate();
      if (id === 'clear') clear();
      if (id === 'inspect') inspect(selected + 1);
      if (id === 'count') {
         count = WORKCELL.counts[(WORKCELL.counts.indexOf(count) + 1) % WORKCELL.counts.length];
         countInput.value = String(count);
         countText.textBox(`${count} MODULES`, .043);
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
      countText.textBox(`${count} MODULES`, .043);
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
      modules.forEach(module => module.visual.update(model.time));
      hovering = null;
      for (const button of buttons) {
         const hit = beam.hitRect(button.node.getGlobalMatrix()) !== null;
         if (hit) hovering = button.id;
         button.node.color(hit ? [1, .8, .25] : [.07, .48, .62]);
         button.text.identity().move(button.x, 1.33, -1.765).scale(.20);
      }
      title.identity().move(0, 1.90, -1.77).scale(.32);
      promptText.identity().move(0, 1.79, -1.77).scale(.28);
      statusText.identity().move(0, 1.68, -1.77).scale(.27);
      countText.identity().move(0, 1.57, -1.77).scale(.3);
      detailText.identity().move(0, 1.44, -1.77).scale(.25);
   });
};

export const deinit = () => cleanup();
export const onReload = async (_scene, model) => { cleanup(); model.clear(); await init(model); };
