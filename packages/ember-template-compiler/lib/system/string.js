/**
@module ember
@submodule ember-template-compiler
*/

// This module is duplicated from ember-runtime to support bind-attr.

var STRING_DECAMELIZE_REGEXP = (/([a-z\d])([A-Z])/g);
var STRING_DASHERIZE_REGEXP = (/[ _]/g);

export function decamelize(str) {
  return str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase();
}

export function dasherize(str) {
  return decamelize(str).replace(STRING_DASHERIZE_REGEXP, '-');
}
