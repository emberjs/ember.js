import { CapturedArguments, VM, VMArguments } from '@glimmer/interfaces';
import { HelperRootReference } from '@glimmer/reference';
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

export default function(args: VMArguments, vm: VM) {
  return new HelperRootReference(log, args.capture(), vm.env);
}
