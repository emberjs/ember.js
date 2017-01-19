import { UpdatableReference } from '@glimmer/object-reference';
import { TestEnvironment, TestDynamicScope } from '@glimmer/test-helpers';
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

class DbmonDatabase extends Component {
  db: null;

  get queries() {
    let samples = this.attrs.db.samples;
    return samples[samples.length - 1].queries;
  }

  get topFiveQueries() {
    let queries = this.queries;
    let topFiveQueries = queries.slice(0, 5);

    while (topFiveQueries.length < 5) {
      topFiveQueries.push({ query: "" });
    }

    return topFiveQueries.map(function(query, index) {
      return {
        key: index+'',
        query: query.query,
        elapsed: query.elapsed ? formatElapsed(query.elapsed) : '',
        className: elapsedClass(query.elapsed)
      };
    });
  }

  get countClassName() {
    let queries = this.queries;
    let countClassName = "label";

    if (queries.length >= 20) {
      countClassName += " label-important";
    } else if (queries.length >= 10) {
      countClassName += " label-warning";
    } else {
      countClassName += " label-success";
    }

    return countClassName;
  }
}

let env = new TestEnvironment();

env.registerEmberishGlimmerComponent('dbmon-database', DbmonDatabase as any, `
 <tr>
  <td class="dbname">
  {{db.name}}
  </td>
  <td class="query-count">
    <span class="{{countClassName}}">
      {{queries.length}}
    </span>
  </td>
  {{#each topFiveQueries key="key" as |query|}}
    <td class="Query {{query.className}}">
      {{query.elapsed}}
      <div class="popover left">
        <div class="popover-content">{{query.query}}</div>
        <div class="arrow"></div>
      </div>
    </td>
  {{/each}}
 </tr>
`);

let app = env.compile(`
{{#if fps}}<div id="fps">{{fps}} FPS</div>{{/if}}

<table class="table table-striped latest-data">
  <tbody>
    {{#each model.databaseArray key='name' as |db|}}
      {{dbmon-database db=db}}
    {{/each}}
  </tbody>
</table>
`);

let serversRef;
let result;
let clear;
let fps;
let playing = false;

export function init() {
  let output = document.getElementById('output');
  let model = generateData();

  console.time('initial render');
  env.begin();

  serversRef = new UpdatableReference({ model });
  result = app.render(serversRef, output, new TestDynamicScope());

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

  env.begin();

  let lastFrame = null;
  let fpsMeter = new ExponentialMovingAverage(2/121);

  let callback = () => {
    let thisFrame = window.performance.now();

    onFrame();

    if (lastFrame) {
      fps = Math.round(fpsMeter.push(1000 / (thisFrame - lastFrame)));
    }

    result.rerender();
    clear = requestAnimationFrame(callback);
    lastFrame = thisFrame;
  };

  callback();

  lastFrame = null;
}

function onFrame() {
  let model = generateData(serversRef.databaseArray);

  serversRef.update({ model, fps });
}

const ROWS = 100;

function getData() {
  // generate some dummy data
  let data = {
    start_at: new Date().getTime() / 1000,
    databases: {}
  };

  for (let i = 1; i <= ROWS; i++) {
    data.databases["cluster" + i] = {
      queries: []
    };

    data.databases["cluster" + i + "slave"] = {
      queries: []
    };
  }

  Object.keys(data.databases).forEach(function(dbname) {
    let info = data.databases[dbname];

    let r = Math.floor((Math.random() * 10) + 1);
    for (let i = 0; i < r; i++) {
      let q = {
        canvas_action: null,
        canvas_context_id: null,
        canvas_controller: null,
        canvas_hostname: null,
        canvas_job_tag: null,
        canvas_pid: null,
        elapsed: Math.random() * 15,
        query: "SELECT blah FROM something",
        waiting: Math.random() < 0.5
      };

      if (Math.random() < 0.2) {
        q.query = "<IDLE> in transaction";
      }

      if (Math.random() < 0.1) {
        q.query = "vacuum";
      }

      info.queries.push(q);
    }

    info.queries = info.queries.sort(function(a, b) {
      return b.elapsed - a.elapsed;
    });
  });

  return data;
}

function generateData(oldData: any = {}) {
  let rawData = getData();

  let databases = (oldData && oldData.databases) || {};
  let databaseArray = [];

  let data = { databases, databaseArray };

  Object.keys(rawData.databases).forEach(dbname => {
    let sampleInfo = rawData.databases[dbname];

    if (!databases[dbname]) {
      databases[dbname] = {
        name: dbname,
        samples: []
      };
    }

    let samples = databases[dbname].samples;

    samples.push({
      time: rawData.start_at,
      queries: sampleInfo.queries
    });

    if (samples.length > 5) {
      samples.splice(0, samples.length - 5);
    }

    databaseArray.push(databases[dbname]);
  });

  return data;
}

// utils

function elapsedClass(elapsed) {
  if (elapsed >= 10.0) {
    return "elapsed warn_long";
  } else if (elapsed >= 1.0) {
    return "elapsed warn";
  } else {
    return "elapsed short";
  }
}

function lpad(str, padding, toLength) {
  return padding.repeat((toLength - str.length) / padding.length).concat(str);
}

function formatElapsed(value) {
  let str = parseFloat(value).toFixed(2);
  if (value > 60) {
    let minutes = Math.floor(value / 60);
    let comps = (value % 60).toFixed(2).split('.');
    let seconds = lpad(comps[0], '0', 2);
    let ms = comps[1];
    str = minutes + ":" + seconds + "." + ms;
  }
  return str;
}
