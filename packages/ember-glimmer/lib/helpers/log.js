import { InternalHelperReference } from '../utils/references';
/**
@module ember
@submodule ember-glimmer
*/

import Logger from 'ember-console';

/**
  `log` allows you to output the value of variables in the current rendering
  context. `log` also accepts primitive types such as strings or numbers.

  ```handlebars
  {{log "myVariable:" myVariable }}
  ```

  @method log
  @for Ember.Templates.helpers
  @param {Array} params
  @public
*/
function log({ positional }) {
  Logger.log.apply(null, positional.value());
}

export default function(vm, args) {
  return new InternalHelperReference(log, args);
}
