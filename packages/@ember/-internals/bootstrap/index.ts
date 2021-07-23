import require from 'require';

(function bootstrap() {
  // Bootstrap Node module
  // eslint-disable-next-line no-undef
  if (typeof module === 'object' && typeof module.require === 'function') {
    // tslint:disable-next-line: no-require-imports
    module.exports = require('ember').default;
  }
})();
