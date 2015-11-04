import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { read, isStream } from 'ember-metal/streams/utils';
import ControllerMixin from 'ember-runtime/mixins/controller';

export function readViewFactory(object, owner) {
  var value = read(object);
  var viewClass;

  if (typeof value === 'string') {
    assert('View requires an owner to resolve views not passed in through the context', !!owner);
    viewClass = owner._lookupFactory('view:' + value);
  } else {
    viewClass = value;
  }

  assert(`${value} must be a subclass or an instance of Ember.View, not ${viewClass}`, (function(viewClass) {
    return viewClass && (viewClass.isViewFactory || viewClass.isView || viewClass.isComponentFactory || viewClass.isComponent);
  })(viewClass));

  return viewClass;
}

export function readComponentFactory(nameOrStream, owner) {
  var name = read(nameOrStream);
  var componentLookup = owner.lookup('component-lookup:main');
  assert(
    'Could not find \'component-lookup:main\' on the provided container, ' +
    'which is necessary for performing component lookups',
    componentLookup
  );

  return componentLookup.lookupFactory(name, owner);
}

export function readUnwrappedModel(object) {
  if (isStream(object)) {
    var result = object.value();

    // If the path is exactly `controller` then we don't unwrap it.
    if (object.label !== 'controller') {
      while (ControllerMixin.detect(result)) {
        result = get(result, 'model');
      }
    }

    return result;
  } else {
    return object;
  }
}
