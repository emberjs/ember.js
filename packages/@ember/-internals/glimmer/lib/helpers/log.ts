import { CapturedArguments, VMArguments } from '@glimmer/interfaces';
import { InternalHelperReference } from '../utils/references';
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
function log({ positional }: CapturedArguments) {
  /* eslint-disable no-console */
  console.log(...positional.value());
  /* eslint-enable no-console */
}

export default function(args: VMArguments) {
  return new InternalHelperReference(log, args.capture());
}
