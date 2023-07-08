/**
@module ember
*/

/**
  Use the {{unique-id}} helper to generate a unique ID string suitable for use as
  an ID attribute in the DOM.

  ```handlebars
  <input id={{unique-id}} type="email" />
  ```
  Each invocation of {{unique-id}} will return a new, unique ID string.
  You can use the `let` helper to create an ID that can be reused within a template.

  ```handlebars
  {{#let (unique-id) as |emailId|}}
    <label for={{emailId}}>Email address</label>
    <input id={{emailId}} type="email" />
  {{/let}}
  ```

  @method unique-id
  @for Ember.Templates.helpers
  @since 4.4.0
  @public
  */

import type { Reference } from '@glimmer/reference';
import { createConstRef } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

export default internalHelper((): Reference<string> => {
  return createConstRef(uniqueId(), 'unique-id');
});

// From https://gist.github.com/selfish/fef2c0ba6cdfe07af76e64cecd74888b
//
// This code should be reasonably fast, and provide a unique value every time
// it's called, which is what we need here. It produces a string formatted as a
// standard UUID, which avoids accidentally turning Ember-specific
// implementation details into an intimate API. It also ensures that the UUID
// always starts with a letter, to avoid creating invalid IDs with a numeric
// digit at the start.
export function uniqueId(): string {
  // @ts-expect-error this one-liner abuses weird JavaScript semantics that
  // TypeScript (legitimately) doesn't like, but they're nonetheless valid and
  // specced.
  return ([3e7] + -1e3 + -4e3 + -2e3 + -1e11).replace(/[0-3]/g, (a) =>
    ((a * 4) ^ ((Math.random() * 16) >> (a & 2))).toString(16)
  );
}
