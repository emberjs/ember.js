import isEnabled from 'ember-metal/features';
import require from 'require';

export default (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/helper').default;
  } else {
    return require('ember-htmlbars/helper').default;
  }
}());

export const helper = (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/helper').helper;
  } else {
    return require('ember-htmlbars/helper').helper;
  }
}());
