import { Cache } from '@ember/-internals/utils';
import { EMBER_GLIMMER_ANGLE_BRACKET_NESTED_LOOKUP } from '@ember/canary-features';

/*
  This diverges from `Ember.String.dasherize` so that`<XFoo />` can resolve to `x-foo`.
  `Ember.String.dasherize` would resolve it to `xfoo`..
*/
const SIMPLE_DASHERIZE_REGEXP = /[A-Z]|::/g;
const ALPHA = /[A-Za-z0-9]/;

export default new Cache<string, string>(1000, key =>
  key.replace(SIMPLE_DASHERIZE_REGEXP, (char, index) => {
    if (char === '::') {
      if (EMBER_GLIMMER_ANGLE_BRACKET_NESTED_LOOKUP) {
        return '/';
      } else {
        return char;
      }
    }

    if (index === 0 || !ALPHA.test(key[index - 1])) {
      return char.toLowerCase();
    }

    return `-${char.toLowerCase()}`;
  })
);
