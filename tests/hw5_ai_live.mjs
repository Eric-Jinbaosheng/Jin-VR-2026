// Run while the course server is listening: node tests/hw5_ai_live.mjs
import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../js/scenes/ai_workcell_data.js', import.meta.url), 'utf8');
const { requestWorkcell, countSolidOverlaps } =
   await import('data:text/javascript,' + encodeURIComponent(source));
const description = 'Generate a robot warehouse with 3 shelves and 10 boxes';

const counts = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [5, 20, 50];
for (const count of counts) {
   const started = Date.now();
   let calls = 0;
   try {
      const data = await requestWorkcell(async prompt => {
         calls++;
         const response = await fetch('http://localhost:2026/api/aiquery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: prompt, responseFormat: 'json' })
         });
         const result = await response.json();
         if (!response.ok) throw new Error(result.details || result.error);
         return JSON.parse(result.response || result.message?.content || '');
      }, description, count);
      console.log(JSON.stringify({ requested: count, returned: data.objects.length,
         calls, adjustments: data.adjustments, possibleOverlaps: countSolidOverlaps(data.objects), title: data.title,
         shelfNamedParts: data.objects.filter(item => /shelf|rack/i.test(item.name)).length,
         boxNamedParts: data.objects.filter(item => /box|crate/i.test(item.name)).length,
         elapsedSeconds: Math.round((Date.now() - started) / 1000) }));
   } catch (error) {
      console.log(JSON.stringify({ requested: count, calls, error: error.message,
         elapsedSeconds: Math.round((Date.now() - started) / 1000) }));
   }
}
