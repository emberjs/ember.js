/**
@module ember
@submodule ember-htmlbars
*/
import Logger from "ember-metal/logger";
import { read } from "ember-metal/streams/utils";

/**
  `log` allows you to output the value of variables in the current rendering
  context. `log` also accepts primitive types such as strings or numbers.

  ```handlebars
  {{log "myVariable:" myVariable }}
  ```

  @method log
  @for Ember.Handlebars.helpers
  @param {String} property
*/
export function logHelper(params, hash, options, env) {
  var logger = Logger.log;
  var values = [];

  for (var i = 0; i < params.length; i++) {
    values.push(read(params[i]));
  }

  logger.apply(logger, values);
}
