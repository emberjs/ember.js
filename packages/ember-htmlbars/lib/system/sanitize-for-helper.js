/**
  Sanitize options so that all helpers have `types`, `hash`, and `hashTypes`.

  @private
  @method sanitizeOptionsForHelper
  @param {Object} options The options hash provided by the template engine.
*/
export function sanitizeOptionsForHelper(options) {
  if (!options.types) {
    options.types = [];
  }

  if (!options.hashTypes) {
    options.hashTypes = {};
  }

  return options;
}
