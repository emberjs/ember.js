import { helper } from '../helper';
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
  @param {Array} params
  @public
*/
function log(params) {
  Logger.log.apply(null, params);
  return ''; // FIXME: Helper will currently return and render 'undefined', remove when fixed
}

export default helper(log);
