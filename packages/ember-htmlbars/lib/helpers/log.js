/**
@module ember
@submodule ember-handlebars
*/
import Logger from "ember-metal/logger";

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
export function logHelper(params, options, env) {
  var logger = Logger.log;
  var values = [];

  for (var i = 0; i < params.length; i++) {
    if (options.types[i] === 'id') {
      var stream = params[i];
      values.push(stream.value());
    } else {
      values.push(params[i]);
    }
  }

  logger.apply(logger, values);
}
