/* jshint esnext:true */

import Benchmark from 'benchmark';

import { logToConsole as logging } from 'config';
import { benchmarks as suites } from 'benchmarks';

// JDD will be making this change for 2.0
Benchmark.Deferred.prototype.end = Benchmark.Deferred.prototype.resolve;

var versionedBenchmark = {};

function log(message) {
  if (logging) {
    console.log(message);
  }
}

function groupStart(message) {
  if (logging) {
    console.group(message);
  }
}

function groupEnd() {
  if (logging) {
    console.groupEnd();
  }
}

function onError(event) {
  console.error('Error occured "' + event.target.error.message + '" in ' + event.target.name);
}

function startSuite(event) {
  groupStart('[' + this.name + ']');
}

function onCycle(event) {
  var suiteName = event.currentTarget.name,
      benchmark = event.target;

  versionedBenchmark = { version: document.title, name: suiteName, info: benchmark, infoString: benchmark.toString() };
  log('- ' + String(event.target));
}

function onComplete(event) {
  groupEnd();
  log('Fastest for ' + this.name + ' is ' +  this.filter('fastest').pluck('name')[0]);
  window.parent.postMessage(JSON.stringify(versionedBenchmark), 'http://localhost:8000');
  run();
}

export function run() {
  if (!suites.length) { return; }

  var suite = suites.shift();

  suite.on('start', function(event) {
    startSuite.call(this, event);
  })
  .on('cycle', function(event) {
    onCycle.call(this, event);
  })
  .on('complete', function(event) {
    onComplete.call(this, event);
  })
  .on('error', function(event) {
    onError.call(this, event);
  })
  .run({ async: true });
}
