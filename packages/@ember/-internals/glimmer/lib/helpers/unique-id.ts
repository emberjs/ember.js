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

import { createConstRef, Reference } from '@glimmer/reference';
import { internalHelper } from './internal-helper';

export default internalHelper(
  (): Reference<string> => {
    return createConstRef(uniqueId(), 'unique-id');
  }
);

// From https://gist.github.com/selfish/fef2c0ba6cdfe07af76e64cecd74888b
//
// This code should be reasonably fast, and provide a unique value every time
// it's called, which is what we need here. It produces a string formatted as a
// standard UUID, which avoids accidentally turning Ember-specific
// implementation details into an intimate API.
function uniqueId() {
  // @ts-expect-error this one-liner abuses weird JavaScript semantics that
  // TypeScript (legitimately) doesn't like, but they're nonetheless valid and
  // specced.
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (a) =>
    (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
  );
}
