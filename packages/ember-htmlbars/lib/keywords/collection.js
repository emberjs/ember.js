/**
@module ember
@submodule ember-templates
*/

import { readViewFactory } from 'ember-views/streams/utils';
import CollectionView from 'ember-views/views/collection_view';
import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';
import assign from 'ember-metal/assign';

/**
  `{{collection}}` is a template helper for adding instances of
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
  @for Ember.Templates.helpers
  @deprecated Use `{{each}}` helper instead.
  @public
*/
export default {
  setupState(state, env, scope, params, hash) {
    var read = env.hooks.getValue;

    return assign({}, state, {
      parentView: env.view,
      viewClassOrInstance: getView(read(params[0]), env.container)
    });
  },

  rerender(morph, env, scope, params, hash, template, inverse, visitor) {
    // If the hash is empty, the component cannot have extracted a part
    // of a mutable param and used it in its layout, because there are
    // no params at all.
    if (Object.keys(hash).length) {
      return morph.getState().manager.rerender(env, hash, visitor, true);
    }
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    var state = node.getState();
    var parentView = state.parentView;

    var options = { component: state.viewClassOrInstance, layout: null };
    if (template) {
      options.createOptions = {
        _itemViewTemplate: template && { raw: template },
        _itemViewInverse: inverse && { raw: inverse }
      };
    }

    if (hash.itemView) {
      hash.itemViewClass = hash.itemView;
    }

    if (hash.emptyView) {
      hash.emptyViewClass = hash.emptyView;
    }

    var nodeManager = ViewNodeManager.create(node, env, hash, options, parentView, null, scope, template);
    state.manager = nodeManager;

    nodeManager.render(env, hash, visitor);
  }
};

function getView(viewPath, container) {
  var viewClassOrInstance;

  if (!viewPath) {
    viewClassOrInstance = CollectionView;
  } else {
    viewClassOrInstance = readViewFactory(viewPath, container);
  }

  return viewClassOrInstance;
}
