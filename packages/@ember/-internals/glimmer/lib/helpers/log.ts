import { VMArguments } from '@glimmer/interfaces';
import { createComputeRef } from '@glimmer/reference';
import { reifyPositional } from '@glimmer/runtime';

/**
@module ember
*/

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
export default function (args: VMArguments) {
  let positional = args.positional.capture();

  return createComputeRef(() => {
    /* eslint-disable no-console */
    console.log(...reifyPositional(positional));
    /* eslint-enable no-console */
  });
}
