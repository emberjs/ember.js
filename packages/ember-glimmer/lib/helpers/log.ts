import {
  Arguments,
  CapturedArguments,
  VM
} from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';
/**
@module ember
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
function log({ positional }: CapturedArguments) {
  Logger.log.apply(null, positional.value());
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(log, args.capture());
}
