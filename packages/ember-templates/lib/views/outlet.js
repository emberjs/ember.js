import isEnabled from 'ember-metal/features';
import require from 'require';

export default (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/views/outlet').default;
  } else {
    return require('ember-htmlbars/views/outlet').OutletView;
  }
}());
