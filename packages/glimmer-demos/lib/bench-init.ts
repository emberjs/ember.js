import { BenchmarkReporter, BenchmarkEnvironment, BenchmarkScenario, BenchmarkSuite } from './bench';
import { TestReporter, TestBenchmarkEnvironment } from './bench-infra';

declare function require(module: string): any;

interface ScenarioClass {
  new(reporter: BenchmarkReporter, env: BenchmarkEnvironment): BenchmarkScenario;
}

import Suites from './bench-suites';

export function init() {
  let options = getJsonFromUrl();

  if (!options['suite']) {
    document.writeln('<h1>Please select a benchmark suite</h1>');
    document.writeln('<ul>');

    Object.keys(Suites).forEach(id => {
      document.writeln(` <li><a href="?suite=${id}">${id}</a></li>`);
    });

    document.writeln('</ul>');

    return;
  }


  let scenarios: ScenarioClass[] = require('glimmer-demos').Suites[options['suite']];
  let suite = new BenchmarkSuite();
  let env = new TestBenchmarkEnvironment();
  let reporter = new TestReporter();

  scenarios.forEach(S => suite.add(new S(reporter, env)));

  let div = document.createElement('div');
  div.id = "buttons";

  let buttons = Object.keys(suite.scenarios).forEach(name => {
    let button = document.createElement('button');
    button.onclick = () => suite.run(name);
    button.innerText = name;
    div.appendChild(button);
  });

  document.body.insertBefore(div, document.body.firstChild);

}

function getJsonFromUrl(hashBased?) {
  var query;
  if(hashBased) {
    var pos = location.href.indexOf("?");
    if(pos==-1) return [];
    query = location.href.substr(pos+1);
  } else {
    query = location.search.substr(1);
  }
  var result = {};
  query.split("&").forEach(function(part) {
    if(!part) return;
    part = part.split("+").join(" "); // replace every + with space, regexp-free version
    var eq = part.indexOf("=");
    var key = eq>-1 ? part.substr(0,eq) : part;
    var val = eq>-1 ? decodeURIComponent(part.substr(eq+1)) : "";
    var from = key.indexOf("[");
    if(from==-1) result[decodeURIComponent(key)] = val;
    else {
      var to = key.indexOf("]");
      var index = decodeURIComponent(key.substring(from+1,to));
      key = decodeURIComponent(key.substring(0,from));
      if(!result[key]) result[key] = [];
      if(!index) result[key].push(val);
      else result[key][index] = val;
    }
  });
  return result;
}

