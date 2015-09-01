/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import BasicStream from 'ember-metal/streams/stream';
import KeyStream from 'ember-metal/streams/key-stream';
import { isStream } from 'ember-metal/streams/utils';
import subscribe from 'ember-htmlbars/utils/subscribe';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import {
  addObserver,
  removeObserver
} from 'ember-metal/observer';

function labelFor(source, key) {
  const sourceLabel = source.label ? source.label : '';
  const keyLabel = key.label ? key.label : '';
  return `(get ${sourceLabel} ${keyLabel})`;
}

let DynamicKeyStream = BasicStream.extend({
  init(source, keySource) {
    assert('DynamicKeyStream error: source must be a stream', isStream(source)); // TODO: This isn't necessary.

    // used to get the original path for debugging and legacy purposes
    var label = labelFor(source, keySource);

    this.label = label;
    this.path = label;
    this.sourceDep = this.addMutableDependency(source);
    this.keyDep = this.addMutableDependency(keySource);
    this.observedObject = null;
    this.observedKey = null;
  },

  key() {
    const key = this.keyDep.getValue();
    if (typeof key === 'string') {
      assert('DynamicKeyStream error: key must not have a \'.\'', key.indexOf('.') === -1);
      return key;
    }
  },

  compute() {
    var object = this.sourceDep.getValue();
    var key = this.key();
    if (object && key) {
      return get(object, key);
    }
  },

  setValue(value) {
    var object = this.sourceDep.getValue();
    var key = this.key();
    if (object) {
      set(object, key, value);
    }
  },

  _super$revalidate: BasicStream.prototype.revalidate,

  revalidate(value) {
    this._super$revalidate(value);

    var object = this.sourceDep.getValue();
    var key = this.key();
    if (object !== this.observedObject || key !== this.observedKey) {
      this._clearObservedObject();

      if (object && typeof object === 'object' && key) {
        addObserver(object, key, this, this.notify);
        this.observedObject = object;
        this.observedKey = key;
      }
    }
  },

  _clearObservedObject() {
    if (this.observedObject) {
      removeObserver(this.observedObject, this.observedKey, this, this.notify);
      this.observedObject = null;
      this.observedKey = null;
    }
  }
});

const buildStream = function buildStream(params) {
  const [objRef, pathRef] = params;

  assert('The first argument to {{get}} must be a stream', isStream(objRef));
  assert('{{get}} requires at least two arguments', params.length > 1);

  const stream = buildDynamicKeyStream(objRef, pathRef);

  return stream;
};

function buildDynamicKeyStream(source, keySource) {
  if (!isStream(keySource)) {
    return new KeyStream(source, keySource);
  } else {
    return new DynamicKeyStream(source, keySource);
  }
}

/**
  Dynamically look up a property on an object. The second argument to `{{get}}`
  should have a string value, although it can be bound.

  For example, these two usages are equivilent:

  ```handlebars
  {{person.height}}
  {{get person "height"}}
  ```

  If there were several facts about a person, the `{{get}}` helper can dynamically
  pick one:

  ```handlebars
  {{get person factName}}
  ```

  For a more complex example, this template would allow the user to switch
  between showing the user's height and weight with a click:

  ```handlebars
  {{get person factName}}
  <button {{action (mut factName) "height"}}>Show height</button>
  <button {{action (mut factName) "weight"}}>Show weight</button>
  ```

  The `{{get}}` helper can also respect mutable values itself. For example:

  ```handlebars
  {{input value=(mut (get person factName)) type="text"}}
  <button {{action (mut factName) "height"}}>Show height</button>
  <button {{action (mut factName) "weight"}}>Show weight</button>
  ```

  Would allow the user to swap what fact is being displayed, and also edit
  that fact via a two-way mutable binding.

  @public
  @method get
  @for Ember.Templates.helpers
*/
var getKeyword = function getKeyword(morph, env, scope, params, hash, template, inverse, visitor) {
  if (morph === null) {
    return buildStream(params);
  } else {
    let stream;
    if (morph.linkedResult) {
      stream = morph.linkedResult;
    } else {
      stream = buildStream(params);

      subscribe(morph, env, scope, stream);
      env.hooks.linkRenderNode(morph, env, scope, null, params, hash);

      morph.linkedResult = stream;
    }
    env.hooks.range(morph, env, scope, null, stream, visitor);
  }

  return true;
};

export default getKeyword;
