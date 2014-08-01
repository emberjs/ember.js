/**
@module ember
@submodule ember-handlebars
*/

import Ember from "ember-metal/core"; // Ember.assert, Ember.deprecate
import { inspect } from "ember-metal/utils";

// var emberAssert = Ember.assert;
    // emberDeprecate = Ember.deprecate;

import EmberHandlebars from "ember-handlebars-compiler";
var helpers = EmberHandlebars.helpers;

import { fmt } from "ember-runtime/system/string";
import { get } from "ember-metal/property_get";
import { handlebarsGet, handlebarsGetView } from "ember-handlebars/ext";
import { ViewHelper } from "ember-handlebars/helpers/view";
import { computed } from "ember-metal/computed";
import CollectionView from "ember-views/views/collection_view";

var alias = computed.alias;
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
  {{#collection contentBinding="App.items"}}
    Hi {{view.content.name}}
  {{/collection}}
  ```

  And the following application code

  ```javascript
  App = Ember.Application.create()
  App.items = [
    Ember.Object.create({name: 'Dave'}),
    Ember.Object.create({name: 'Mary'}),
    Ember.Object.create({name: 'Sara'})
  ]
  ```

  Will result in the HTML structure below

  ```html
  <div class="ember-view">
    <div class="ember-view">Hi Dave</div>
    <div class="ember-view">Hi Mary</div>
    <div class="ember-view">Hi Sara</div>
  </div>
  ```

  ### Blockless use in a collection

  If you provide an `itemViewClass` option that has its own `template` you can
  omit the block.

  The following template:

  ```handlebars
  {{collection contentBinding="App.items" itemViewClass="App.AnItemView"}}
  ```

  And application code

  ```javascript
  App = Ember.Application.create();
  App.items = [
    Ember.Object.create({name: 'Dave'}),
    Ember.Object.create({name: 'Mary'}),
    Ember.Object.create({name: 'Sara'})
  ];

  App.AnItemView = Ember.View.extend({
    template: Ember.Handlebars.compile("Greetings {{view.content.name}}")
  });
  ```

  Will result in the HTML structure below

  ```html
  <div class="ember-view">
    <div class="ember-view">Greetings Dave</div>
    <div class="ember-view">Greetings Mary</div>
    <div class="ember-view">Greetings Sara</div>
  </div>
  ```

  ### Specifying a CollectionView subclass

  By default the `{{collection}}` helper will create an instance of
  `Ember.CollectionView`. You can supply a `Ember.CollectionView` subclass to
  the helper by passing it as the first argument:

  ```handlebars
  {{#collection App.MyCustomCollectionClass contentBinding="App.items"}}
    Hi {{view.content.name}}
  {{/collection}}
  ```

  ### Forwarded `item.*`-named Options

  As with the `{{view}}`, helper options passed to the `{{collection}}` will be
  set on the resulting `Ember.CollectionView` as properties. Additionally,
  options prefixed with `item` will be applied to the views rendered for each
  item (note the camelcasing):

  ```handlebars
  {{#collection contentBinding="App.items"
                itemTagName="p"
                itemClassNames="greeting"}}
    Howdy {{view.content.name}}
  {{/collection}}
  ```

  Will result in the following HTML structure:

  ```html
  <div class="ember-view">
    <p class="ember-view greeting">Howdy Dave</p>
    <p class="ember-view greeting">Howdy Mary</p>
    <p class="ember-view greeting">Howdy Sara</p>
  </div>
  ```

  @method collection
  @for Ember.Handlebars.helpers
  @param {String} path
  @param {Hash} options
  @return {String} HTML string
  @deprecated Use `{{each}}` helper instead.
*/
function collectionHelper(path, options) {
  Ember.deprecate("Using the {{collection}} helper without specifying a class has been deprecated as the {{each}} helper now supports the same functionality.", path !== 'collection');

  // If no path is provided, treat path param as options.
  if (path && path.data && path.data.isRenderData) {
    options = path;
    path = undefined;
    Ember.assert("You cannot pass more than one argument to the collection helper", arguments.length === 1);
  } else {
    Ember.assert("You cannot pass more than one argument to the collection helper", arguments.length === 2);
  }

  var fn        = options.fn,
      data      = options.data,
      inverse   = options.inverse,
      view      = options.data.view,
      // This should be deterministic, and should probably come from a
      // parent view and not the controller.
      container = (view.controller && view.controller.container ? view.controller.container : view.container);

  // If passed a path string, convert that into an object.
  // Otherwise, just default to the standard class.
  var collectionClass;
  if (path) {
    collectionClass = handlebarsGetView(this, path, container, options.data);
    Ember.assert(fmt("%@ #collection: Could not find collection class %@", [data.view, path]), !!collectionClass);
  }
  else {
    collectionClass = CollectionView;
  }

  var hash = options.hash;
  var itemHash = {};
  var match;

  // Extract item view class if provided else default to the standard class
  var collectionPrototype = collectionClass.proto();
  var itemViewClass;

  if (hash.itemView) {
    itemViewClass = handlebarsGetView(this, hash.itemView, container, options.data);
  } else if (hash.itemViewClass) {
    itemViewClass = handlebarsGetView(collectionPrototype, hash.itemViewClass, container, options.data);
  } else {
    itemViewClass = handlebarsGetView(collectionPrototype, collectionPrototype.itemViewClass, container, options.data);
  }

  Ember.assert(fmt("%@ #collection: Could not find itemViewClass %@", [data.view, itemViewClass]), !!itemViewClass);

  delete hash.itemViewClass;
  delete hash.itemView;

  // Go through options passed to the {{collection}} helper and extract options
  // that configure item views instead of the collection itself.
  for (var prop in hash) {
    if (hash.hasOwnProperty(prop)) {
      match = prop.match(/^item(.)(.*)$/);

      if (match && prop !== 'itemController') {
        // Convert itemShouldFoo -> shouldFoo
        itemHash[match[1].toLowerCase() + match[2]] = hash[prop];
        // Delete from hash as this will end up getting passed to the
        // {{view}} helper method.
        delete hash[prop];
      }
    }
  }

  if (fn) {
    itemHash.template = fn;
    delete options.fn;
  }

  var emptyViewClass;
  if (inverse && inverse !== EmberHandlebars.VM.noop) {
    emptyViewClass = get(collectionPrototype, 'emptyViewClass');
    emptyViewClass = emptyViewClass.extend({
          template: inverse,
          tagName: itemHash.tagName
    });
  } else if (hash.emptyViewClass) {
    emptyViewClass = handlebarsGetView(this, hash.emptyViewClass, container, options.data);
  }
  if (emptyViewClass) { hash.emptyView = emptyViewClass; }

  if (hash.keyword) {
    itemHash._context = this;
  } else {
    itemHash._context = alias('content');
  }

  var viewOptions = ViewHelper.propertiesFromHTMLOptions({ data: data, hash: itemHash }, this);
  hash.itemViewClass = itemViewClass.extend(viewOptions);

  options.helperName = options.helperName || 'collection';

  return helpers.view.call(this, collectionClass, options);
}

export default collectionHelper;

