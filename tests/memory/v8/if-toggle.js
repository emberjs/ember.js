/**
 * `{{#if}}` blocks that change branch.
 * Each change renders the block again from its closure (`TryOpcode`).
 *
 * Run: node if-toggle.js
 */
import { makeElement, renderComponent, run, template, trackedObject } from './lib/setup.js';
import { measure, runBenches } from './lib/bench.js';

const BLOCKS = 100;

const state = trackedObject({ show: false });
const Row = template(`<span class="row">{{@n}}</span><b>{{@n}}</b>`);
const ns = Array.from({ length: BLOCKS }, (_, i) => i);

const App = template(
  `{{#each ns as |n|}}{{#if state.show}}<Row @n={{n}} />{{else}}<i>{{n}}</i>{{/if}}{{/each}}`,
  { scope: () => ({ ns, state, Row }) }
);

renderComponent(App, { into: makeElement(), owner: {} });

measure(`toggle ${BLOCKS} {{#if}} blocks twice`, () => {
  run(() => (state.show = true));
  run(() => (state.show = false));
});

await runBenches();
