/* HW4: AI generated robot assembly missions in a playable VR workbench. */
import { AIQuery } from '../util/aiquery.js';
import { ControllerBeam } from '../render/core/controllerInput.js';
import { LAB, countForDifficulty, missionPrompt, validateMission, reachesTarget } from './ai_robot_lab_mission.js';

let cleanup = () => {};
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export const init = async model => {
   const ai = new AIQuery({ timeout: 60000 });
   const beam = new ControllerBeam(model, 'right');
   const partsRoot = model.add();
   const goalsRoot = model.add();
   let mission = null, parts = [], difficulty = 'easy', busy = false, active = true;
   let held = null, heldBy = null, grabOffset = [0, 0, 0], hovered = null;
   let status = 'SELECT A DIFFICULTY TO GENERATE A MISSION';
   let hint = 'GRAB A PART AND MOVE IT TO ITS MATCHING PAD';

   const makeText = (value, size, color) => {
      const node = model.add().textBox(value, size).color(color).dull();
      node.child(0).scale(1, 1, .001);
      return node;
   };
   const titleText = makeText('AI ROBOT LAB', .09, [.35, .9, 1]);
   const missionText = makeText('AI BUILDS EACH MISSION', .052, [1, 1, 1]);
   const instructionText = makeText('SELECT EASY, MEDIUM OR HARD', .043, [.75, .87, 1]);
   const statusText = makeText(status, .047, [.4, 1, .65]);
   const hintText = makeText(hint, .04, [1, .85, .4]);
   const scoreText = makeText('0 / 0 PARTS PLACED', .052, [1, 1, 1]);
   const panel = model.add('square').move(0, 1.58, -1.18).scale(.72, .42, 1).color(.012, .035, .055).dull();
   const table = model.add('cube').move(0, .98, -.65).scale(.72, .06, .36).color(.12, .18, .23).dull();
   model.add('cube').move(0, .91, -.65).scale(.69, .025, .33).color(.04, .55, .68).dull();
   for (const x of [-.57, .57])
      model.add('cube').move(x, .59, -.65).scale(.045, .33, .26).color(.13, .18, .23).dull();
   model.add('cube').move(-.36, 1.048, -.65).scale(.28, .012, .31).color(.025, .10, .14).dull();
   model.add('cube').move(.36, 1.048, -.65).scale(.28, .012, .31).color(.025, .10, .14).dull();
   const buttons = [
      { id: 'easy', x: -.54, label: 'EASY' },
      { id: 'medium', x: -.27, label: 'MEDIUM' },
      { id: 'hard', x: 0, label: 'HARD' },
      { id: 'hint', x: .27, label: 'HINT' },
      { id: 'new', x: .54, label: 'NEW' }
   ].map(b => ({ ...b,
      node: model.add('square').move(b.x, 1.22, -1.13).scale(.12, .052, 1).color(.08, .55, .7).dull(),
      text: makeText(b.label, .055, [1, 1, 1])
   }));

   const desktop = document.createElement('section');
   desktop.setAttribute('aria-label', 'AI Robot Lab desktop controls');
   desktop.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:10000;width:310px;max-height:70vh;overflow:auto;padding:13px;background:#102432ee;color:#fff;border:1px solid #5bbbd1;border-radius:10px;font:14px Arial,sans-serif;box-shadow:0 5px 20px #0008';
   desktop.innerHTML = '<strong>AI ROBOT LAB</strong><p data-summary>Select a difficulty to ask AI for a mission.</p><div style="display:flex;gap:5px"><button data-action="easy">Easy</button><button data-action="medium">Medium</button><button data-action="hard">Hard</button><button data-action="new">New mission</button><button data-action="hint">Hint</button></div><p data-message aria-live="polite"></p><p data-hint aria-live="polite"></p><div data-parts></div>';
   document.body.appendChild(desktop);
   const summary = desktop.querySelector('[data-summary]');
   const message = desktop.querySelector('[data-message]');
   const hintOutput = desktop.querySelector('[data-hint]');
   const partsList = desktop.querySelector('[data-parts]');
   let desktopSelected = null;

   const setStatus = value => {
      status = value;
      statusText.textBox(value, .047);
      message.textContent = value;
   };
   const setHint = value => {
      hint = value;
      hintText.textBox(value, .04);
      hintOutput.textContent = value;
   };
   const updateProgress = () => {
      const done = parts.filter(p => p.done).length;
      scoreText.textBox(`${done} / ${parts.length} PARTS PLACED`, .052);
      if (parts.length && done === parts.length) setStatus('MISSION COMPLETE! CHOOSE NEW FOR ANOTHER AI TASK');
      else if (parts.length) setStatus(`${done} / ${parts.length} PLACED - MATCH EACH PART TO ITS PAD`);
      renderDesktopParts();
   };
   const clearRoot = root => { while (root.nChildren()) root.remove(0); };
   const colorCss = rgb => `rgb(${rgb.map(c => Math.round(c * 255)).join(',')})`;
   const renderDesktopParts = () => {
      partsList.replaceChildren();
      if (!parts.length) return;
      const note = document.createElement('p');
      note.textContent = 'Desktop: click or drag a part onto its numbered target.';
      partsList.appendChild(note);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px';
      parts.forEach((part, i) => {
         const button = document.createElement('button');
         button.textContent = `${i + 1}. ${part.data.shape}${part.done ? ' ✓' : ''}`;
         button.style.borderLeft = `8px solid ${colorCss(part.data.color)}`;
         button.disabled = part.done;
         button.draggable = !part.done;
         button.onclick = () => { desktopSelected = i; renderDesktopParts(); };
         button.ondragstart = e => e.dataTransfer.setData('text/plain', String(i));
         if (desktopSelected === i) button.style.outline = '2px solid white';
         row.appendChild(button);
      });
      partsList.appendChild(row);
      parts.forEach((part, i) => {
         const target = document.createElement('button');
         target.textContent = `TARGET ${i + 1}${part.done ? ' ✓' : ''}`;
         target.style.cssText = `margin:2px;padding:8px;border:2px solid ${colorCss(part.data.color)};background:#183643;color:white`;
         target.disabled = part.done;
         target.onclick = () => desktopPlace(desktopSelected, i);
         target.ondragover = e => e.preventDefault();
         target.ondrop = e => { e.preventDefault(); desktopPlace(Number(e.dataTransfer.getData('text/plain')), i); };
         partsList.appendChild(target);
      });
   };
   const finishPart = part => {
      if (reachesTarget(part.position, part.data.target)) {
         part.position = [part.data.target[0], LAB.partY, part.data.target[2]];
         part.done = true;
         if (typeof vibrate === 'function') vibrate('right', .7, 70);
      }
      updateProgress();
   };
   const desktopPlace = (selected, target) => {
      if (!Number.isInteger(selected) || !parts[selected] || parts[selected].done) return;
      if (selected !== target) {
         setStatus('THAT PART BELONGS ON ITS MATCHING NUMBERED PAD');
         return;
      }
      parts[selected].position = [parts[selected].data.target[0], LAB.partY, parts[selected].data.target[2]];
      desktopSelected = null;
      finishPart(parts[selected]);
   };

   const buildMission = data => {
      held = null;
      heldBy = null;
      desktopSelected = null;
      clearRoot(partsRoot);
      clearRoot(goalsRoot);
      mission = data;
      parts = data.objects.map((obj, i) => {
         const goal = goalsRoot.add('cube').move(obj.target[0], LAB.targetY, obj.target[2])
            .scale(.105, .012, .105).color(obj.color).opacity(.55).dull();
         const marker = goalsRoot.add('sphere').move(obj.target[0], LAB.targetY + .016, obj.target[2])
            .scale(.024, .008, .024).color(1, 1, 1).dull();
         const part = partsRoot.add(obj.shape).color(obj.color).dull();
         return { data: obj, node: part, goal, marker, position: obj.start.slice(), done: false, index: i };
      });
      missionText.textBox(data.title.toUpperCase(), .052);
      instructionText.textBox(data.instruction.toUpperCase(), .043);
      summary.textContent = `${data.title}: ${data.instruction}`;
      setHint('MATCH COLORS AND NUMBERS. ASK AI FOR A HINT.');
      updateProgress();
   };
   const generate = async selected => {
      if (busy || !active) return;
      difficulty = selected;
      busy = true;
      setStatus(`ASKING AI FOR A ${difficulty.toUpperCase()} MISSION...`);
      try {
         const raw = await ai.askAIJson(missionPrompt(difficulty));
         const data = validateMission(raw, difficulty);
         if (active) buildMission(data);
      } catch (error) {
         if (active) setStatus(`AI ERROR: ${String(error.message).slice(0, 75)}. PRESS NEW TO RETRY`);
         console.error('[AI Robot Lab] Mission generation failed:', error);
      } finally { busy = false; }
   };
   const askHint = async () => {
      if (busy || !mission || parts.every(p => p.done)) return;
      busy = true;
      setHint('AI IS THINKING...');
      try {
         const progress = parts.map(p => ({ id: p.data.id, done: p.done,
            current: p.position, target: p.data.target }));
         const answer = await ai.askAI(`You are a concise VR robot lab instructor. Mission: ${JSON.stringify(mission)}. Current progress: ${JSON.stringify(progress)}. Give one practical hint in English, maximum 100 characters. Mention one unfinished part, but do not list all answers.`);
         if (active) setHint(answer.trim().slice(0, 100).toUpperCase() || 'MOVE A PART CLOSER TO ITS COLORED PAD');
      } catch (error) {
         if (active) setHint(`HINT ERROR: ${String(error.message).slice(0, 75)}`);
      } finally { busy = false; }
   };
   const action = id => {
      if (id === 'hint') askHint();
      else if (id === 'new') generate(difficulty);
      else generate(id);
   };
   desktop.querySelectorAll('[data-action]').forEach(button =>
      button.onclick = () => action(button.dataset.action));

   inputEvents.onPress = hand => {
      if (hand !== 'right' || busy) return;
      if (hovered) { action(hovered); return; }
      if (!parts.length) return;
      const handPos = inputEvents.pos(hand);
      if (!Array.isArray(handPos) || handPos.length !== 3) return;
      const candidate = parts.filter(p => !p.done).sort((a, b) =>
         distance(a.position, handPos) - distance(b.position, handPos))[0];
      if (candidate && distance(candidate.position, handPos) < .16) {
         held = candidate;
         heldBy = hand;
         grabOffset = candidate.position.map((v, i) => v - handPos[i]);
         setStatus(`MOVING PART ${candidate.index + 1} TO ITS TARGET`);
         if (typeof vibrate === 'function') vibrate(hand, .5, 40);
      }
   };
   inputEvents.onDrag = hand => {
      if (!held || heldBy !== hand) return;
      const pos = inputEvents.pos(hand);
      if (!Array.isArray(pos) || pos.length !== 3) return;
      held.position = [
         clamp(pos[0] + grabOffset[0], LAB.xMin, LAB.xMax),
         clamp(pos[1] + grabOffset[1], 1.06, 1.38),
         clamp(pos[2] + grabOffset[2], LAB.zMin, LAB.zMax)
      ];
   };
   inputEvents.onRelease = hand => {
      if (!held || heldBy !== hand) return;
      const part = held;
      held = null;
      heldBy = null;
      finishPart(part);
   };

   cleanup = () => {
      active = false;
      desktop.remove();
      inputEvents.onPress = () => {};
      inputEvents.onDrag = () => {};
      inputEvents.onRelease = () => {};
   };
   model.animate(() => {
      if (!active) return;
      beam.update();
      hovered = null;
      for (const button of buttons) {
         const over = beam.hitRect(button.node.getGlobalMatrix()) !== null;
         if (over) hovered = button.id;
         button.node.color(over ? [1, .8, .25] : button.id === difficulty ? [.12, .85, .55] : [.08, .55, .7]);
         button.text.identity().move(button.x, 1.22, -1.11).scale(.18);
      }
      titleText.identity().move(0, 1.93, -1.15).scale(.34);
      missionText.identity().move(0, 1.79, -1.15).scale(.35);
      instructionText.identity().move(0, 1.69, -1.15).scale(.29);
      statusText.identity().move(0, 1.57, -1.15).scale(.3);
      hintText.identity().move(0, 1.47, -1.15).scale(.27);
      scoreText.identity().move(0, 1.37, -1.15).scale(.3);
      for (const part of parts) {
         part.node.identity().move(part.position).scale(part.data.scale).color(part.data.color);
         part.goal.color(part.done ? [.25, 1, .4] : part.data.color);
      }
   });
};

export const deinit = () => cleanup();
