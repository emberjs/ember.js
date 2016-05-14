import isEnabled from 'ember-metal/features';
import require from 'require';

export default (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/components/text_field').default;
  } else {
    return require('ember-htmlbars/components/text_field').default;
  }
}());
