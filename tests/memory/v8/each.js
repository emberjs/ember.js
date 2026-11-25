/**
 * `{{#each}}` lists that gain and lose items.
 * Each new item renders from the list's closure (`ListBlockOpcode`).
 *
 * Run: node each.js
 */
import { makeElement, renderComponent, run, template, trackedObject } from './lib/setup.js';
import { measure, runBenches } from './lib/bench.js';

const ITEMS = 100;

function makeItems(prefix) {
  return Array.from({ length: ITEMS }, (_, i) => ({ id: `${prefix}${i}`, label: `item ${i}` }));
}

const listA = makeItems('a');
const listB = makeItems('b');
const empty = [];

const state = trackedObject({ items: empty });
const Item = template(`<li class="item" data-id={{@item.id}}>{{@item.label}}</li>`);

const App = template(
  `<ul>{{#each state.items key="id" as |item|}}<Item @item={{item}} />{{/each}}</ul>`,
  { scope: () => ({ state, Item }) }
);

renderComponent(App, { into: makeElement(), owner: {} });

measure(`add ${ITEMS} items, then remove them`, () => {
  run(() => (state.items = listA));
  run(() => (state.items = empty));
});

run(() => (state.items = listA));

measure(`replace ${ITEMS} items with ${ITEMS} other items, twice`, () => {
  run(() => (state.items = listB));
  run(() => (state.items = listA));
});

await runBenches();
