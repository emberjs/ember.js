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
global.window = {};
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
const document = new SimpleDOM.Document();
document.createElementNS = document.createElement; // TODO:wat
global.document = document;
SimpleDOM.Node.prototype.insertAdjacentHTML = function( ) {};

// end MISC setup

// Load the ember you want
loadFile('./dist/ember.js'); // prod build === no asserts and dev related code
// loadFile('/dist/ember.min.js'); // prod build + minified
// loadFile('/dist/ember.debug.js'); // debug build === asserts and stuff, has perf issues

// do what you want
console.log(Ember);
