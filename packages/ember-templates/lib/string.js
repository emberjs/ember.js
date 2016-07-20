import isEnabled from 'ember-metal/features';
import require from 'require';

let strings = (function() {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/utils/string');
  } else {
    return require('ember-htmlbars/utils/string');
  }
}());

export const SafeString = strings.SafeString;
export const escapeExpression = strings.escapeExpression;
export const htmlSafe = strings.htmlSafe;
export const isHTMLSafe = strings.isHTMLSafe;
