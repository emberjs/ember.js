// GETTING D8 (v8 + basic console):
//   1. git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
//   2. add depot_tools to your path: export PATH=/path/to/depo/tools/depot_tools:"$PATH"
//   3. no, in the cwd where you want v8 to live type: `fetch v8`
//   4. build (for your local architecture) `make native` (otherwise you may wait for a very long time)
//   5. now, you have a d8 at your disposale /path/to/v8/out/x64.debug/d8
//
// GETTING EMBER WORKING:
// most likely you will need to run:
// npm install
// bower install
// npm run build // for one time production build
//
// for active iteration, recommendation is: `ember server --env production`
// Please note: production builds (due to minification, can be abit slow)
//
// want to run an app, checkout: https://github.com/stefanpenner/d8-ember

// handy d8 stuff:
// ---------------
//
// --trace-opt-verbose
// --prof + tick-processor
// enableProfiler() / disableProfiler()
// --trace-inlining
// --trace-gc
// --allow-natives
//    %DebugPrint(x);
//    %OptimizeFunctionOnNextCall(x);
//    %HaveSameMap(x, y);
// --trace-maps
// --trace_generalization
// --help
// --expose-gc
// --print-opt-code --code-comments
//
// begin MISC setup;
const global = new Function('return this;')();
global.self = global;
function loadFile(file) {
  print('load: ' + file);
  load(file);
}

global.console = {
  log(...args) {
    print(...args);
  }
};

global.setTimeout = function(callback) {
  // good enough
  Promise.resolve().then(callback).catch(e => print('error' + e));
};
loadFile('./node_modules/simple-dom/dist/simple-dom.js');

// url protocol
global.URL = {};

// end MISC setup

// Load the ember you want
loadFile('./dist/ember.prod.js'); // prod build === no asserts and dev related code
// loadFile('/dist/ember.min.js'); // prod build + minified
// loadFile('/dist/ember.debug.js'); // debug build === asserts and stuff, has perf issues


// do what you want

// try running `d8 d8-runner.js d8-app.js`
