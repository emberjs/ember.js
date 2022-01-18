import require from 'require';

(function bootstrap() {
  // Bootstrap Node module
  if (typeof module === 'object' && typeof module.require === 'function') {
    module.exports = require('ember').default;
  }
})();
