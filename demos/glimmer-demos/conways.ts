// class Cell {
//   public x: number;
//   public y: number;
//   public key: string;
//   public isAlive: boolean;

//   private a: boolean;
//   private b: boolean;

//   constructor(x, y, isAlive) {
//     this.x = x;
//     this.y = y;

//     this.key = x + "x" + y;
//     this.isAlive = isAlive;
//     this.a = isAlive;
//     this.b = false;
//   }

//   is(other) {
//     return this.x === other.x && this.y === other.y;
//   }

//   toString() {
//     return `cell(x: ${this.x}, y: ${this.y})`;
//   }
// }

// const LIVE = true;
// const DEAD = false;

// function fate(count) {
//   if (count === 3) {
//     return LIVE;
//   }
//   if (count === 4) {
//     return LIVE;
//   } // do nothing

//   return DEAD;
// }

// function alive(width, height, cells) {
//   var result = new Array(width * height);

//   for (var i = 0; i < result.length; i++) {
//     result[i] = DEAD;
//   }

//   for (var i = 0; i < cells.length; i++) {
//     var x, y = cells[i];
//     result[y * width + x] = LIVE;
//   }

//   return result;
// }

// function world(width, height, _cells) {
//   var cells = _cells.map(function (state, index) {
//     return new Cell(index % width, Math.floor(index / width), state);
//   });

//   return new World({ width, height, cells });
// }

// class World {
//   private width: number;
//   private height: number;
//   private cells: Cell[];

//   private _current = 'a';
//   private _next = 'b';

//   constructor({ width, height, cells }) {
//     this.width = width;
//     this.height = height;
//     this.cells = cells; // ensure sorted
//   }

//   forEach(cb) {
//     for (var i = 0; i < this.cells.length; i++) {
//       cb(this.cells[i], i);
//     }
//   }

//   map(cb) {
//     var results = new Array(this.cells.length);
//     for (var i = 0; i < this.cells.length; i++) {
//       results[i] = cb(this.cells[i], i);
//     }
//     return results;
//   }

//   advance() {
//     this.forEach(cell => {
//       cell.isAlive = cell[this._next] = this.willLive(cell);
//     });

//     let tmp = this._current;
//     this._current = this._next;
//     this._next = tmp;
//   }

//   getAt(x, y) {
//     let {width, height, cells, _current} = this;

//     if (x >= width || y >= height || x < 0 || y < 0) {
//       return 0;
//     }

//     return cells[y * width + x][_current] ? 1 : 0;
//   }

//   willLive(cell) {
//     return fate(this.sum(cell)) === LIVE;
//   }

//   sum(cell) {
//     let {x, y} = cell;
//     let sum = 0;

//     sum += this.getAt(x - 1, y - 1);
//     sum += this.getAt(x - 0, y - 1);
//     sum += this.getAt(x + 1, y - 1);

//     sum += this.getAt(x - 1, y - 0);
//     sum += this.getAt(x - 0, y - 0);
//     sum += this.getAt(x + 1, y - 0);

//     sum += this.getAt(x - 1, y + 1);
//     sum += this.getAt(x - 0, y + 1);
//     sum += this.getAt(x + 1, y + 1);

//     return sum;
//   }

//   get length() {
//     return this.cells.length;
//   }
// }
//
// const WORLD_ONE = world(199, 199, alive(199, 199, [[1, 99], [2, 99], [3, 99], [4, 99], [5, 99], [6, 99], [7, 99], [8, 99], [10, 99], [11, 99], [12, 99], [13, 99], [14, 99], [18, 99], [19, 99], [20, 99], [27, 99], [28, 99], [29, 99], [30, 99], [31, 99], [32, 99], [33, 99], [35, 99], [36, 99], [37, 99], [38, 99], [39, 99]]));

import world from 'worlds/one';
import { TestEnvironment, EmberishGlimmerComponent as EmberComponent } from 'glimmer-demos';

// // Bare version
// const app = `{{#each world.cells key="key" as |cell|}}
//   <organism-cell class="{{if cell.isAlive "alive" ""}}" style="top: {{cell.y}}0px; left: {{cell.x}}0px"/>
// {{/each}}`);

// Component version
const app = `{{#each world.cells key="key" as |cell|}}
  <organism-cell-component cell={{cell}} />
{{/each}}`;

let env = new TestEnvironment();

env.registerHelper("if", ([cond, yes, no]) => cond ? yes : no);

env.registerEmberishGlimmerComponent('organism-cell-component', null,
  `<organism-cell class="{{if @cell.isAlive "alive" ""}}" style="top: {{@cell.y}}0px; left: {{@cell.x}}0px" />`);

env.begin();
let res = env.compile(app).render({ world }, env, { appendTo: document.body });
env.commit();

function rerender() {
  world.advance();
  res.rerender();
  requestAnimationFrame(rerender);
}

requestAnimationFrame(rerender);