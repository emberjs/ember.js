import Ember from "ember-metal/core";
import { get } from "ember-metal/property_get";
import { isGlobal } from "ember-metal/path_cache";
import { fmt } from "ember-runtime/system/string";
import { read, isStream } from "ember-metal/streams/utils";
import View from "ember-views/views/view";
import ControllerMixin from "ember-runtime/mixins/controller";

export function readViewFactory(object, container) {
  var value = read(object);
  var viewClass;

  if (typeof value === 'string') {
    if (isGlobal(value)) {
      viewClass = get(null, value);
      Ember.deprecate('Resolved the view "'+value+'" on the global context. Pass a view name to be looked up on the container instead, such as {{view "select"}}.', !viewClass, { url: 'http://emberjs.com/guides/deprecations/#toc_global-lookup-of-views' });
    } else {
      Ember.assert("View requires a container to resolve views not passed in through the context", !!container);
      viewClass = container.lookupFactory('view:'+value);
    }
  } else {
    viewClass = value;
  }

  Ember.assert(fmt(value+" must be a subclass or an instance of Ember.View, not %@", [viewClass]), View.detect(viewClass) || View.detectInstance(viewClass));

  return viewClass;
}

export function readComponentFactory(nameOrStream, container) {
  var name = read(nameOrStream);
  var componentLookup = container.lookup('component-lookup:main');
  Ember.assert("Could not find 'component-lookup:main' on the provided container," +
               " which is necessary for performing component lookups", componentLookup);

  return componentLookup.lookupFactory(name, container);
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
