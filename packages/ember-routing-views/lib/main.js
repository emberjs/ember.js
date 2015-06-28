/**
@module ember
@submodule ember-routing-views
*/

import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';

var reexport = Ember.__reexport;

reexport('ember-routing-views/views/link', 'LinkComponent');
reexport('ember-routing-views/views/outlet', ['OutletView']);

if (isEnabled('ember-routing-core-outlet')) {
  reexport('ember-routing-views/views/outlet', ['CoreOutletView']);
}

export default Ember;
