// Run while the course server is listening: node tests/hw5_detail_live.mjs
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../js/scenes/ai_workcell_data.js', import.meta.url), 'utf8');
const { requestFactoryDetails } = await import('data:text/javascript,' + encodeURIComponent(source));
const item = { name: 'Main Conveyor Line', kind: 'conveyor',
   color: [.15, .48, .64], position: [0, 1.1, -1], scale: [.35, .2, .16] };
let calls = 0;
const details = await requestFactoryDetails(async prompt => {
   calls++;
   const response = await fetch('http://localhost:2026/api/aiquery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: prompt, responseFormat: 'json' })
   });
   const result = await response.json();
   if (!response.ok) throw new Error(result.details || result.error);
   return JSON.parse(result.response || result.message?.content || '');
}, item);
console.log(JSON.stringify({ calls, details }));
