function callForEach(prop, func) {
  return function() {
    for (var i = 0, l = this[prop].length; i < l; i++) {
      this[prop][i][func]();
    }
  };
}

export function buildCompositeAssert(assertClasses) {
  function Composite(env) {
    this.asserts = assertClasses.map(Assert => new Assert(env));
  }

  Composite.prototype = {
    reset: callForEach('asserts', 'reset'),
    inject: callForEach('asserts', 'inject'),
    assert: callForEach('asserts', 'assert'),
    restore: callForEach('asserts', 'restore')
  };

  return Composite;
}

function noop() {}

export function callWithStub(env, name, func, debugStub = noop) {
  let originalFunc = env.getDebugFunction(name);
  try {
    env.setDebugFunction(name, debugStub);
    func();
  } finally {
    env.setDebugFunction(name, originalFunc);
  }
}

export function checkTest(test) {
  return typeof test === 'function' ? test() : test;
}
