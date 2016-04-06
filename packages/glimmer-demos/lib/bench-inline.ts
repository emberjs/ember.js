import { TestEnvironment, TestDynamicScope } from 'glimmer-test-helpers';
import { UpdatableReference } from 'glimmer-object-reference';
import Stats from './stats';

let cycle, logPre;

function smokeTest(name) {
  window['$BENCH'].setup(name);
  let frag = window['$BENCH'].render();
  let d = document.createElement('div');
  d.appendChild(frag);

  if (d.innerHTML !== 'Kris Selden') {
    throw new Error(`${name} is broken: ${d.innerHTML}`);
  }
}

export function init() {
  smokeTest('inline-if');
  smokeTest('block-if');

  cycle = document.getElementById('cycle');

  let runInline = document.getElementById('run-inline');
  runInline.addEventListener('click', () => runBenchmark('inline-if'));

  let runBlock = document.getElementById('run-block');
  runBlock.addEventListener('click', () => runBenchmark('block-if'));

  logPre = document.getElementById('benchmark-log');
}

// function log(message) { logPre.innerHTML += message; }
function logln(message) {
  let pre = document.createElement('pre');
  pre.innerHTML = message;
  logPre.appendChild(pre);
  if (logPre.parentNode === null) alert("WAT");
}

function runBenchmark(name: string) {
  let b = new Benchmark(name, benchmarks[name]);

  b.on('start', function() {
    window['$BENCH'].count = 0;

    logln('Scenario: ' + this.name);
    logln('-----------------------');
  });

  b.on('error', function(e) {
    logln('Error');
    logln(e.message.stack);
  });

  b.on('cycle', function(event) {
    window['$BENCH'].count++;
    let moe = (event.target.stats.moe * 100).toPrecision(2);
    let elapsed = ((Date.now() - event.target.times.timeStamp) / 1000).toPrecision(2);
    cycle.innerHTML = window['$BENCH'].count + ' with moe of ' + moe + '% and ' + elapsed + 's elapsed';
  });

  b.on('complete', function(e) {
    if (this.stats.sample.length === 0) return;
    let stats = new Stats({ bucket_precision: this.stats.moe });
    stats.push(this.stats.sample);
    cycle.innerHTML = "Idle";

    logln('Samples:    ' + this.stats.sample.length);
    logln('Median:     ' + stats.median().toPrecision(4));
    logln('95%:        ' + stats.percentile(95).toPrecision(4));
    logln('99%:        ' + stats.percentile(99).toPrecision(4));
    logln('Confidence: ' + stats.moe().toFixed(4));
    logln('\n');
    logln('Distribution:');
    stats.distribution().forEach(function(d) {
      let start = d.range[0].toPrecision(3);
      let end = d.range[1].toPrecision(3);

      logln(start + ' - ' + end + ' ' + lineOf(d.count, "="));
    });

    logln('\n');
  });

  b.run({ async: true });
}

// Init

let env = new TestEnvironment();

window['$BENCH'] = {
  context: undefined,
  t: undefined,
  count: 0,
  templates: {},
  template: undefined,
  run: true,
  env,
  logln,
  TestDynamicScope
};

env.registerHelper('inline-if', ([cond, truthy, falsy]) => {
  return cond ? truthy : falsy;
});

function benchmark(name, template) {
  window['$BENCH'].templates[name] = window['$BENCH'].env.compile(template);
  return {
    setup: function() {
      window['$BENCH'].setup(this.name);
    },

    fn: function() {
      window['$BENCH'].render();
    }
  };
}

window['$BENCH'].setup = function(name: string) {
  this.run = false;
  this.template = this.templates[name];

  // Context
  let itemId = 0;
  let subitemId = 0;

  let items = [];

  for (let i = 0; i < 250; i++) {
    let subitems = [];

    for (let j = 0; j < 50; j++) {
      subitems.push({
        id: subitemId++
      });
    }

    items.push({
      id: itemId++,
      visible: i % 2 === 0,
      subitems: subitems
    });
  }

  this.context = new UpdatableReference({
    truthy: true,
    value: "Kris Selden"
  });
};

window['$BENCH'].render = function() {
  let { env, context, template, TestDynamicScope } = this;
  let frag = document.createDocumentFragment();
  env.begin();
  template.render(context, env, { appendTo: frag, dynamicScope: new TestDynamicScope(null) });
  env.commit();
  return frag;
};

let benchmarks = {
  'inline-if': benchmark('inline-if',
    '{{inline-if truthy value "empty"}}'
  ),

  'block-if': benchmark('block-if',
    '{{#if truthy}}{{value}}{{else}}empty{{/if}}'
  ),
};

function lineOf(size, char) {
  let out = char;

  for (let i=1; i<size; i++) {
    out += char;
  }

  return out;
}
