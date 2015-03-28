/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert, Ember.deprecate
import { IS_BINDING } from "ember-metal/mixin";
import { fmt } from "ember-runtime/system/string";
import { get } from "ember-metal/property_get";
import CollectionView from "ember-views/views/collection_view";
import { readViewFactory } from "ember-views/streams/utils";
import { map } from 'ember-metal/enumerable_utils';
import {
  streamifyClassNameBinding
} from "ember-views/streams/class_name_binding";
import mergeViewBindings from "ember-htmlbars/system/merge-view-bindings";

/**
  `{{collection}}` is a `Ember.Handlebars` helper for adding instances of
  `Ember.CollectionView` to a template. See [Ember.CollectionView](/api/classes/Ember.CollectionView.html)
   for additional information on how a `CollectionView` functions.

  `{{collection}}`'s primary use is as a block helper with a `contentBinding`
  option pointing towards an `Ember.Array`-compatible object. An `Ember.View`
  instance will be created for each item in its `content` property. Each view
  will have its own `content` property set to the appropriate item in the
  collection.

  The provided block will be applied as the template for each item's view.

  Given an empty `<body>` the following template:

  ```handlebars
  {{! application.hbs }}
  {{#collection content=model}}
    Hi {{view.content.name}}
  {{/collection}}
  ```

  And the following application code

  ```javascript
  App = Ember.Application.create();
  App.ApplicationRoute = Ember.Route.extend({
    model: function() {
      return [{name: 'Yehuda'},{name: 'Tom'},{name: 'Peter'}];
    }
  });
  ```

  The following HTML will result:

  ```html
  <div class="ember-view">
    <div class="ember-view">Hi Yehuda</div>
    <div class="ember-view">Hi Tom</div>
    <div class="ember-view">Hi Peter</div>
  </div>
  ```

  ### Non-block version of collection

  If you provide an `itemViewClass` option that has its own `template` you may
  omit the block.

  The following template:

  ```handlebars
  {{! application.hbs }}
  {{collection content=model itemViewClass="an-item"}}
  ```

  And application code

  ```javascript
  App = Ember.Application.create();
  App.ApplicationRoute = Ember.Route.extend({
    model: function() {
      return [{name: 'Yehuda'},{name: 'Tom'},{name: 'Peter'}];
    }
  });

  App.AnItemView = Ember.View.extend({
    template: Ember.Handlebars.compile("Greetings {{view.content.name}}")
  });
  ```

  Will result in the HTML structure below

  ```html
  <div class="ember-view">
    <div class="ember-view">Greetings Yehuda</div>
    <div class="ember-view">Greetings Tom</div>
    <div class="ember-view">Greetings Peter</div>
  </div>
  ```

  ### Specifying a CollectionView subclass

  By default the `{{collection}}` helper will create an instance of
  `Ember.CollectionView`. You can supply a `Ember.CollectionView` subclass to
  the helper by passing it as the first argument:

  ```handlebars
  {{#collection "my-custom-collection" content=model}}
    Hi {{view.content.name}}
  {{/collection}}
  ```

  This example would look for the class `App.MyCustomCollection`.

  ### Forwarded `item.*`-named Options

  As with the `{{view}}`, helper options passed to the `{{collection}}` will be
  set on the resulting `Ember.CollectionView` as properties. Additionally,
  options prefixed with `item` will be applied to the views rendered for each
  item (note the camelcasing):

  ```handlebars
  {{#collection content=model
                itemTagName="p"
                itemClassNames="greeting"}}
    Howdy {{view.content.name}}
  {{/collection}}
  ```

  Will result in the following HTML structure:

  ```html
  <div class="ember-view">
    <p class="ember-view greeting">Howdy Yehuda</p>
    <p class="ember-view greeting">Howdy Tom</p>
    <p class="ember-view greeting">Howdy Peter</p>
  </div>
  ```

  @method collection
  @for Ember.Handlebars.helpers
  @deprecated Use `{{each}}` helper instead.
*/
export function collectionHelper(params, hash, options, env) {
  var path = params[0];

  Ember.deprecate("Using the {{collection}} helper without specifying a class has been" +
                  " deprecated as the {{each}} helper now supports the same functionality.", path !== 'collection');

  Ember.assert("You cannot pass more than one argument to the collection helper", params.length <= 1);

  var data     = env.data;
  var template = options.template;
  var inverse  = options.inverse;
  var view     = data.view;

  // This should be deterministic, and should probably come from a
  // parent view and not the controller.
  var  controller = get(view, 'controller');
  var  container = (controller && controller.container ? controller.container : view.container);

  // If passed a path string, convert that into an object.
  // Otherwise, just default to the standard class.
  var collectionClass;
  if (path) {
    collectionClass = readViewFactory(path, container);
    Ember.assert(fmt("%@ #collection: Could not find collection class %@", [data.view, path]), !!collectionClass);
  } else {
    collectionClass = CollectionView;
  }

  var itemHash = {};
  var match;

  // Extract item view class if provided else default to the standard class
  var collectionPrototype = collectionClass.proto();
  var itemViewClass;

  if (hash.itemView) {
    itemViewClass = readViewFactory(hash.itemView, container);
  } else if (hash.itemViewClass) {
    itemViewClass = readViewFactory(hash.itemViewClass, container);
  } else {
    itemViewClass = collectionPrototype.itemViewClass;
  }

  if (typeof itemViewClass === 'string') {
    itemViewClass = container.lookupFactory('view:'+itemViewClass);
  }

  Ember.assert(fmt("%@ #collection: Could not find itemViewClass %@", [data.view, itemViewClass]), !!itemViewClass);

  delete hash.itemViewClass;
  delete hash.itemView;

  // Go through options passed to the {{collection}} helper and extract options
  // that configure item views instead of the collection itself.
  for (var prop in hash) {
    if (prop === 'itemController' || prop === 'itemClassBinding') {
      continue;
    }
    if (hash.hasOwnProperty(prop)) {
      match = prop.match(/^item(.)(.*)$/);
      if (match) {
        var childProp = match[1].toLowerCase() + match[2];

        if (IS_BINDING.test(prop)) {
          itemHash[childProp] = view._getBindingForStream(hash[prop]);
        } else {
          itemHash[childProp] = hash[prop];
        }
        delete hash[prop];
      }
    }
  }

  if (template) {
    itemHash.template = template;
    delete options.template;
  }

  var emptyViewClass;
  if (inverse) {
    emptyViewClass = get(collectionPrototype, 'emptyViewClass');
    emptyViewClass = emptyViewClass.extend({
      template: inverse,
      tagName: itemHash.tagName
    });
  } else if (hash.emptyViewClass) {
    emptyViewClass = readViewFactory(hash.emptyViewClass, container);
  }
  if (emptyViewClass) { hash.emptyView = emptyViewClass; }

  var viewOptions = mergeViewBindings(view, {}, itemHash);

  if (hash.itemClassBinding) {
    var itemClassBindings = hash.itemClassBinding.split(' ');
    viewOptions.classNameBindings = map(itemClassBindings, function(classBinding) {
      return streamifyClassNameBinding(view, classBinding);
    });
  }

  hash.itemViewClass = itemViewClass;
  hash._itemViewProps = viewOptions;

  options.helperName = options.helperName || 'collection';

  return env.helpers.view.helperFunction.call(this, [collectionClass], hash, options, env);
}
