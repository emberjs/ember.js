/**
@module ember
@submodule ember-templates
*/

import Logger from 'ember-metal/logger';

/**
  `log` allows you to output the value of variables in the current rendering
  context. `log` also accepts primitive types such as strings or numbers.

  ```handlebars
  {{log "myVariable:" myVariable }}
  ```

  @method log
  @for Ember.Templates.helpers
  @param {*} values
  @public
*/
export default function logHelper(values) {
  Logger.log.apply(null, values);
}
