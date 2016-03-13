import world from 'worlds/one';
import { TestEnvironment, TestDynamicScope, EmberishGlimmerComponent as EmberComponent } from 'glimmer-demos';
import { UpdatableReference } from 'glimmer-reference';

// // Bare version
// const app = `{{#each world.cells key="key" as |cell|}}<organism-cell class="{{if cell.isAlive "alive" ""}}" style="top: {{cell.y}}0px; left: {{cell.x}}0px"/>{{/each}}`;

// Component version
const app = `<div class="world">{{#each world.cells key="key" as |cell|}}<organism-cell-component cell={{cell}} />{{/each}}</div>`;

let env = new TestEnvironment();

env.registerEmberishGlimmerComponent('organism-cell-component', null,
  `<organism-cell class="{{if @cell.isAlive "alive" ""}}" style="top: {{@cell.y}}px; left: {{@cell.x}}px" />`);

let res;
let self;
function startGlimmer() {
  env.begin();
  self = new UpdatableReference({ world })
  res = env.compile(app).render(self, env, { appendTo: document.body, dynamicScope: new TestDynamicScope() });
  env.commit();

  requestAnimationFrame(rerenderGlimmer);
}

function rerenderGlimmer() {
  world.advance();
  self.update({world});
  res.rerender();
  requestAnimationFrame(rerenderGlimmer);
}

window['startGlimmer'] = startGlimmer;

function startDOM() {
  let state: {
    isAlive: boolean[];
    elements: HTMLElement[];
  } = {
    isAlive: [],
    elements: []
  };
  let body = document.body;
  let div = document.createElement("div");
  div.classList.add("world");
  world.forEach((cell, i) => {
    state.isAlive[i] = cell.isAlive;
    let el = state.elements[i] = document.createElement("organism-cell");
    el.style.top = cell.y + "px";
    el.style.left = cell.x + "px";
    if (cell.isAlive) {
      el.classList.add("alive");
    }
    div.appendChild(el);
  });
  body.appendChild(div);
  function updateCell(cell, i) {
    let oldAlive = state.isAlive[i];
    let newAlive = cell.isAlive;
    let el = state.elements[i];
    if (oldAlive !== newAlive) {
      state.isAlive[i] = newAlive;
      newAlive ? el.classList.add("alive") : el.classList.remove("alive");
    }
  }
  function rerenderDOM() {
    world.advance();
    world.forEach(updateCell);
    requestAnimationFrame(rerenderDOM);
  }
  requestAnimationFrame(rerenderDOM);
}

window['startDOM'] = startDOM;
