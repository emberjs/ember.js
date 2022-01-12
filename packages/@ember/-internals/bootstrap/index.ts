import require from 'require';

(function bootstrap() {
  // Bootstrap Node module
  if (typeof module === 'object' && typeof module.require === 'function') {
    // tslint:disable-next-line: no-require-imports
    module.exports = require('ember').default;
  }
})();
