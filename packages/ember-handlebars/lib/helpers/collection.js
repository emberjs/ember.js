/*globals Handlebars */

// TODO: Don't require all of this module
require('ember-handlebars');
require('ember-handlebars/helpers/view');

/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, handlebarsGet = Ember.Handlebars.get, fmt = Ember.String.fmt;

/**
  `{{collection}}` is a `Ember.Handlebars` helper for adding instances of
  `Ember.CollectionView` to a template. See `Ember.CollectionView` for
  additional information on how a `CollectionView` functions.

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

  ### Blockless Use

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
Ember.Handlebars.registerHelper('collection', function(path, options) {
  Ember.deprecate("Using the {{collection}} helper without specifying a class has been deprecated as the {{each}} helper now supports the same functionality.", path !== 'collection');

  // If no path is provided, treat path param as options.
  if (path && path.data && path.data.isRenderData) {
    options = path;
    path = undefined;
    Ember.assert("You cannot pass more than one argument to the collection helper", arguments.length === 1);
  } else {
    Ember.assert("You cannot pass more than one argument to the collection helper", arguments.length === 2);
  }

  var fn = options.fn;
  var data = options.data;
  var inverse = options.inverse;
  var view = options.data.view;

  // If passed a path string, convert that into an object.
  // Otherwise, just default to the standard class.
  var collectionClass;
  collectionClass = path ? handlebarsGet(this, path, options) : Ember.CollectionView;
  Ember.assert(fmt("%@ #collection: Could not find collection class %@", [data.view, path]), !!collectionClass);

  var hash = options.hash, itemHash = {}, match;

  // Extract item view class if provided else default to the standard class
  var collectionPrototype = collectionClass.proto(),
      itemViewClass;

  if (hash.itemView) {
    var controller = data.keywords.controller;
    Ember.assert('itemView given, but no container is available', controller && controller.container);
    var container = controller.container;
    itemViewClass = container.resolve('view:' + Ember.String.camelize(hash.itemView));
    Ember.assert('itemView not found in container', !!itemViewClass);
  } else if (hash.itemViewClass) {
    itemViewClass = handlebarsGet(collectionPrototype, hash.itemViewClass, options);
  } else {
    itemViewClass = collectionPrototype.itemViewClass;
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
  if (inverse && inverse !== Handlebars.VM.noop) {
    emptyViewClass = get(collectionPrototype, 'emptyViewClass');
    emptyViewClass = emptyViewClass.extend({
          template: inverse,
          tagName: itemHash.tagName
    });
  } else if (hash.emptyViewClass) {
    emptyViewClass = handlebarsGet(this, hash.emptyViewClass, options);
  }
  if (emptyViewClass) { hash.emptyView = emptyViewClass; }

  if (!hash.keyword) {
    itemHash._context = Ember.computed.alias('content');
  }

  var viewOptions = Ember.Handlebars.ViewHelper.propertiesFromHTMLOptions({ data: data, hash: itemHash }, this);
  hash.itemViewClass = itemViewClass.extend(viewOptions);

  return Ember.Handlebars.helpers.view.call(this, collectionClass, options);
});

