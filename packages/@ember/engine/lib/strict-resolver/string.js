import Cache from './cache';

const STRING_DASHERIZE_REGEXP = /[ _]/g;
const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;

const DECAMELIZE_CACHE = new Cache(1000, (str) =>
  str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase()
);

const STRING_DASHERIZE_CACHE = new Cache(1000, (key) =>
  DECAMELIZE_CACHE.get(key).replace(STRING_DASHERIZE_REGEXP, '-')
);

export function dasherize(str) {
  return STRING_DASHERIZE_CACHE.get(str);
}
