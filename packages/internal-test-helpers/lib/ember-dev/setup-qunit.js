export default function setupQUnit(assertion, _qunitGlobal) {
  var qunitGlobal = QUnit;

  if (_qunitGlobal) {
    qunitGlobal = _qunitGlobal;
  }

  var originalModule = qunitGlobal.module;

  qunitGlobal.module = function(name, _options) {
    var options = _options || {};
    var originalSetup = options.setup || options.beforeEach || function() {};
    var originalTeardown =
      options.teardown || options.afterEach || function() {};

    delete options.setup;
    delete options.teardown;

    options.beforeEach = function() {
      assertion.reset();
      assertion.inject();

      return originalSetup.apply(this, arguments);
    };

    options.afterEach = function() {
      let result = originalTeardown.apply(this, arguments);

      assertion.assert();
      assertion.restore();

      return result;
    };

    return originalModule(name, options);
  };
}
