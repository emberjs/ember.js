// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Handlebars */

// TODO: Don't require all of this module
require('ember-handlebars');
require('ember-handlebars/helpers/view');

var get = Ember.get, getPath = Ember.Handlebars.getPath, fmt = Ember.String.fmt;

/**
  `{{collection}}` is a `Ember.Handlebars` helper for adding instances of
  `Ember.CollectionView` to a template.  See `Ember.CollectionView` for additional
  information on how a `CollectionView` functions.

  `{{collection}}`'s primary use is as a block helper with a `contentBinding` option
  pointing towards an `Ember.Array`-compatible object.  An `Ember.View` instance will
  be created for each item in its `content` property. Each view will have its own
  `content` property set to the appropriate item in the collection.

  The provided block will be applied as the template for each item's view.

  Given an empty `<body>` the following template:

      <script type="text/x-handlebars">
        {{#collection contentBinding="App.items"}}
          Hi {{content.name}}
        {{/collection}}
      </script>

  And the following application code

      App = Ember.Application.create()
      App.items = [
        Ember.Object.create({name: 'Dave'}),
        Ember.Object.create({name: 'Mary'}),
        Ember.Object.create({name: 'Sara'})
      ]

  Will result in the HTML structure below

      <div class="ember-view">
        <div class="ember-view">Hi Dave</div>
        <div class="ember-view">Hi Mary</div>
        <div class="ember-view">Hi Sara</div>
      </div>

  ### Blockless Use
  If you provide an `itemViewClass` option that has its own `template` you can omit
  the block.

  The following template:

      <script type="text/x-handlebars">
        {{collection contentBinding="App.items" itemViewClass="App.AnItemView"}}
      </script>

  And application code

      App = Ember.Application.create()
      App.items = [
        Ember.Object.create({name: 'Dave'}),
        Ember.Object.create({name: 'Mary'}),
        Ember.Object.create({name: 'Sara'})
      ]

      App.AnItemView = Ember.View.extend({
        template: Ember.Handlebars.compile("Greetings {{content.name}}")
      })

  Will result in the HTML structure below

      <div class="ember-view">
        <div class="ember-view">Greetings Dave</div>
        <div class="ember-view">Greetings Mary</div>
        <div class="ember-view">Greetings Sara</div>
      </div>

  ### Specifying a CollectionView subclass
  By default the `{{collection}}` helper will create an instance of `Ember.CollectionView`.
  You can supply a `Ember.CollectionView` subclass to the helper by passing it
  as the first argument:

      <script type="text/x-handlebars">
        {{#collection App.MyCustomCollectionClass contentBinding="App.items"}}
          Hi {{content.name}}
        {{/collection}}
      </script>


  ### Forwarded `item.*`-named Options
  As with the `{{view}}`, helper options passed to the `{{collection}}` will be set on
  the resulting `Ember.CollectionView` as properties. Additionally, options prefixed with
  `item` will be applied to the views rendered for each item (note the camelcasing):

        <script type="text/x-handlebars">
          {{#collection contentBinding="App.items"
                        itemTagName="p"
                        itemClassNames="greeting"}}
            Howdy {{content.name}}
          {{/collection}}
        </script>

  Will result in the following HTML structure:

      <div class="ember-view">
        <p class="ember-view greeting">Howdy Dave</p>
        <p class="ember-view greeting">Howdy Mary</p>
        <p class="ember-view greeting">Howdy Sara</p>
      </div>
  
  @name Handlebars.helpers.collection
  @param {String} path
  @param {Hash} options
  @returns {String} HTML string
*/
Ember.Handlebars.registerHelper('collection', function(path, options) {
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

  // If passed a path string, convert that into an object.
  // Otherwise, just default to the standard class.
  var collectionClass;
  collectionClass = path ? getPath(this, path, options) : Ember.CollectionView;
  Ember.assert(fmt("%@ #collection: Could not find %@", data.view, path), !!collectionClass);

  var hash = options.hash, itemHash = {}, match;

  // Extract item view class if provided else default to the standard class
  var itemViewClass, itemViewPath = hash.itemViewClass;
  var collectionPrototype = collectionClass.proto();
  delete hash.itemViewClass;
  itemViewClass = itemViewPath ? getPath(collectionPrototype, itemViewPath, options) : collectionPrototype.itemViewClass;
  Ember.assert(fmt("%@ #collection: Could not find %@", data.view, itemViewPath), !!itemViewClass);

  // Go through options passed to the {{collection}} helper and extract options
  // that configure item views instead of the collection itself.
  for (var prop in hash) {
    if (hash.hasOwnProperty(prop)) {
      match = prop.match(/^item(.)(.*)$/);

      if(match) {
        // Convert itemShouldFoo -> shouldFoo
        itemHash[match[1].toLowerCase() + match[2]] = hash[prop];
        // Delete from hash as this will end up getting passed to the
        // {{view}} helper method.
        delete hash[prop];
      }
    }
  }

  var tagName = hash.tagName || collectionPrototype.tagName;

  if (fn) {
    itemHash.template = fn;
    delete options.fn;
  }

  if (inverse && inverse !== Handlebars.VM.noop) {
    var emptyViewClass = get(collectionPrototype, 'emptyViewClass');

    hash.emptyView = emptyViewClass.extend({
      template: inverse,
      tagName: itemHash.tagName
    });
  }

  if (hash.eachHelper === 'each') {
    itemHash._templateContext = Ember.computed(function() {
      return get(this, 'content');
    }).property('content');
    delete hash.eachHelper;
  }

  hash.itemViewClass = Ember.Handlebars.ViewHelper.viewClassFromHTMLOptions(itemViewClass, { data: data, hash: itemHash }, this);

  return Ember.Handlebars.helpers.view.call(this, collectionClass, options);
});



