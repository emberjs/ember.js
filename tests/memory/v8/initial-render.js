/**
 * A first render, then its destruction.
 * This path makes no block rerender, so it is the control for the other scripts.
 *
 * Run: node initial-render.js
 */
import { destroy, makeElement, renderComponent, run, template } from './lib/setup.js';
import { measure, runBenches } from './lib/bench.js';

const ROWS = 100;

const rows = Array.from({ length: ROWS }, (_, i) => ({ id: i, label: `row ${i}` }));
const Row = template(`<tr><td>{{@row.id}}</td><td>{{@row.label}}</td></tr>`);

const App = template(
  `<table><tbody>{{#each rows key="id" as |row|}}<Row @row={{row}} />{{/each}}</tbody></table>`,
  { scope: () => ({ rows, Row }) }
);

const element = makeElement();
const owner = {};

measure(`render ${ROWS} rows, then destroy them`, () => {
  let result = renderComponent(App, { into: element, owner });

  run(() => destroy(result));
});

await runBenches();
