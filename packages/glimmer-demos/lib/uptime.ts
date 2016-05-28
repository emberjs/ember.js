import { UpdatableReference } from 'glimmer-object-reference';
import { TestEnvironment, TestDynamicScope } from 'glimmer-test-helpers';
import ExponentialMovingAverage from './ema';

class Component {
  public attrs: any;
  public element: Element = null;

  static create({ attrs }: { attrs: any }): Component {
    return new this(attrs);
  }

  constructor(attrs: any) {
    this.attrs = attrs;
  }

  set(key: string, value: any) {
    this[key] = value;
  }

  didInitAttrs() {}
  didUpdateAttrs() {}
  didReceiveAttrs() {}
  willInsertElement() {}
  willUpdate() {}
  willRender() {}
  didInsertElement() {}
  didUpdate() {}
  didRender() {}
}

class ServerUptime extends Component {
  get upDays() {
    return this.attrs.days.reduce((upDays, day) => {
      return upDays += (day.up ? 1 : 0);
    }, 0);
  }

  get streak() {
    let [max] = this.attrs.days.reduce(([max, streak], day) => {
      if (day.up && streak + 1 > max) {
        return [streak + 1, streak + 1];
      } else if (day.up) {
        return [max, streak + 1];
      } else {
        return [max, 0];
      }
    }, [0, 0]);

    return max;
  }
}

class UptimeDay extends Component {
  get color() {
    return this.attrs.day.up ? '#8cc665' : '#ccc';
  }

  get memo() {
    return this.attrs.day.up ? 'Servers operational!' : 'Red alert!';
  }
}

let env = new TestEnvironment();

env.registerEmberishGlimmerComponent('uptime-day', UptimeDay as any, `
  <div class="uptime-day">
    <span class="uptime-day-status" style="background-color: {{color}}" />
    <span class="hover">{{@day.number}}: {{memo}}</span>
  </div>
`);

env.registerEmberishGlimmerComponent('server-uptime', ServerUptime as any, `
  <div class="server-uptime">
    <h1>{{@name}}</h1>
    <h2>{{upDays}} Days Up</h2>
    <h2>Biggest Streak: {{streak}}</h2>

    <div class="days">
      {{#each @days key="number" as |day|}}
        <uptime-day day={{day}} />
      {{/each}}
    </div>
  </div>
`);

let app = env.compile(`
  {{#if fps}}<div id="fps">{{fps}} FPS</div>{{/if}}

  {{#each servers key="name" as |server|}}
    <server-uptime name={{server.name}} days={{server.days}} />
  {{/each}}
`);

let serversRef;
let result;
let clear;
let fps;
let playing = false;

export function init() {
  let output = document.getElementById('output');

  console.time('initial render');
  env.begin();

  serversRef = new UpdatableReference({ servers: generateServers(), fps: null });
  result = app.render(serversRef, env, { appendTo: output, dynamicScope: new TestDynamicScope(null) });

  console.log(env['createdComponents'].length);
  env.commit();
  console.timeEnd('initial render');
}

export function toggle() {
  if (playing) {
    window['playpause'].innerHTML = "Play";
    cancelAnimationFrame(clear);
    clear = null;
    fps = null;
    playing = false;
  } else {
    window['playpause'].innerHTML = "Pause";
    start();
    playing = true;
  }
}

function start() {
  playing = true;

  let lastFrame = null;
  let fpsMeter = new ExponentialMovingAverage(2/121);

  let callback = () => {
    let thisFrame = window.performance.now();

    if (lastFrame) {
      fps = Math.round(fpsMeter.push(1000 / (thisFrame - lastFrame)));
    }

    onFrame();
    result.rerender();

    clear = requestAnimationFrame(callback);

    lastFrame = thisFrame;
  };

  callback();

  lastFrame = null;
}

function onFrame() {
  serversRef.update({ servers: generateServers(), fps });
}

function generateServer(name: string) {
  let days = [];

  for (let i=0; i<=364; i++) {
    let up = Math.random() > 0.2;
    days.push({ number: i, up });
  }

  return { name, days };
}

function generateServers() {
  return [
    generateServer("Stefan's Server"),
    generateServer("Godfrey's Server"),
    generateServer("Yehuda's Server")
  ];
}
