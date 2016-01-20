import world from 'worlds/one';
import { TestEnvironment, EmberishGlimmerComponent as EmberComponent } from 'glimmer-demos';

// // Bare version
// const app = `{{#each world.cells key="key" as |cell|}}<organism-cell class="{{if cell.isAlive "alive" ""}}" style="top: {{cell.y}}0px; left: {{cell.x}}0px"/>{{/each}}`;

// Component version
const app = `{{#each world.cells key="key" as |cell|}}<organism-cell-component cell={{cell}} />{{/each}}`;

let env = new TestEnvironment();

env.registerEmberishGlimmerComponent('organism-cell-component', null,
  `<organism-cell class="{{if @cell.isAlive "alive" ""}}" style="top: {{@cell.y}}0px; left: {{@cell.x}}0px" />`);

let res;

function startGlimmer() {
  env.begin();
  res = env.compile(app).render({ world }, env, { appendTo: document.body });
  env.commit();

  requestAnimationFrame(rerenderGlimmer);
}

function rerenderGlimmer() {
  world.advance();
  res.rerender();
  requestAnimationFrame(rerenderGlimmer);
}

window['startGlimmer'] = startGlimmer;

let $cells = {};

function startDOM() {
  let $body = document.body;

  world.forEach(cell => {
    let el = document.createElement("organism-cell");

    let className = cell.isAlive ? "alive" : "";
    let style = `top: ${cell.y}0px; left: ${cell.x}0px`;

    el.setAttribute("class", className);
    el.setAttribute("style", style);

    $body.appendChild(el);

    $cells[cell.key] = { el, className, style };
  });

  requestAnimationFrame(rerenderDOM);
}

function rerenderDOM() {
  world.advance();

  world.forEach(cell => {
    let $cell = $cells[cell.key];
    let { el, className, style } = $cells[cell.key];

    let newClassName = cell.isAlive ? "alive" : "";
    let newStyle = `top: ${cell.y}0px; left: ${cell.x}0px`;

    if (newClassName !== className) {
      $cell.className = newClassName;
      el.setAttribute("class", newClassName);
    }

    if (newStyle !== style) {
      $cell.style = newStyle;
      el.setAttribute("style", newStyle);
    }
  });

  requestAnimationFrame(rerenderDOM);
}


window['startDOM'] = startDOM;
