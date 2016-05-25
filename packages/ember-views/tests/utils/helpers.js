import isEnabled from 'ember-metal/features';
import require from 'require';

export let OutletView;

if (isEnabled('ember-glimmer')) {
  OutletView = require('ember-glimmer/views/outlet').default;
} else {
  OutletView = require('ember-htmlbars/views/outlet').OutletView;
}
