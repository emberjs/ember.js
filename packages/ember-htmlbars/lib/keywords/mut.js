/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import  symbol from 'ember-metal/symbol';
import ProxyStream from '../streams/proxy-stream';
import BasicStream from '../streams/stream';
import { isStream } from '../streams/utils';
import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';
import { INVOKE, ACTION } from 'ember-routing-htmlbars/keywords/closure-action';

export let MUTABLE_REFERENCE = symbol('MUTABLE_REFERENCE');

let MutStream = ProxyStream.extend({
  init(stream) {
    this.label = `(mut ${stream.label})`;
    this.path = stream.path;
    this.sourceDep = this.addMutableDependency(stream);
    this[MUTABLE_REFERENCE] = true;
  },

  cell() {
    let source = this;
    let value = source.value();

    if (value && value[ACTION]) {
      return value;
    }

    let val = {
      value,
      update(val) {
        source.setValue(val);
      }
    };

    val[MUTABLE_CELL] = true;
    return val;
  },
  [INVOKE](val) {
    this.setValue(val);
  }
});

/**
  The `mut` helper lets you __clearly specify__ that a child `Component` can update the
  (mutable) value passed to it, which will __change the value of the parent component__.

  This is very helpful for passing mutable values to a `Component` of any size, but
  critical to understanding the logic of a large/complex `Component`.

  To specify that a parameter is mutable, when invoking the child `Component`:

  ```handlebars
  {{my-child childClickCount=(mut totalClicks)}}
  ```

  The child `Component` can then modify the parent's value as needed:

  ```javascript
  // my-child.js
  export default Component.extend({
    click() {
      this.get('childClickCount').update(this.get('childClickCount').value + 1);
    }
  });
  ```

  Additionally, the `mut` helper can be combined with the `action` helper to
  mutate a value. For example:

  ```handlebars
  {{my-child childClickCount=totalClicks click-count-change=(action (mut "totalClicks"))}}
  ```

  The child `Component` would invoke the action with the new click value:

  ```javascript
  // my-child.js
  export default Component.extend({
    click() {
      this.get('clickCountChange')(this.get('childClickCount') + 1);
    }
  });
  ```

  The `mut` helper changes the `totalClicks` value to what was provided as the action argument.

  See a [2.0 blog post](http://emberjs.com/blog/2015/05/10/run-up-to-two-oh.html#toc_the-code-mut-code-helper) for
  additional information on using `{{mut}}`.

  @public
  @method mut
  @param {Object} [attr] the "two-way" attribute that can be modified.
  @for Ember.Templates.helpers
  @public
*/
export default function mut(morph, env, scope, originalParams, hash, template, inverse) {
  // If `morph` is `null` the keyword is being invoked as a subexpression.
  if (morph === null) {
    var valueStream = originalParams[0];
    return mutParam(env.hooks.getValue, valueStream);
  }

  return true;
}

export function privateMut(morph, env, scope, originalParams, hash, template, inverse) {
  // If `morph` is `null` the keyword is being invoked as a subexpression.
  if (morph === null) {
    var valueStream = originalParams[0];
    return mutParam(env.hooks.getValue, valueStream, true);
  }

  return true;
}

let LiteralStream = BasicStream.extend({
  init(literal) {
    this.literal = literal;
    this.label = `(literal ${literal})`;
  },

  compute() {
    return this.literal;
  },

  setValue(val) {
    this.literal = val;
    this.notify();
  }
});

function mutParam(read, stream, internal) {
  if (internal) {
    if (!isStream(stream)) {
      let literal = stream;
      stream = new LiteralStream(literal);
    }
  } else {
    assert('You can only pass a path to mut', isStream(stream));
  }

  if (stream[MUTABLE_REFERENCE]) {
    return stream;
  }

  return new MutStream(stream);
}
