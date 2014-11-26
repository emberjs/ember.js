
/**
@module ember
@submodule ember-views
*/

import Ember from "ember-metal/core"; // Ember.assert
import { isGlobalPath } from "ember-metal/binding";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { fmt } from "ember-runtime/system/string";
import ContainerView from "ember-views/views/container_view";
import CoreView from "ember-views/views/core_view";
import View from "ember-views/views/view";
import {
  observer,
  beforeObserver
} from "ember-metal/mixin";
import { readViewFactory } from "ember-views/streams/read";
import EmberArray from "ember-runtime/mixins/array";

/**
  `Ember.CollectionView` is an `Ember.View` descendent responsible for managing
  a collection (an array or array-like object) by maintaining a child view object
  and associated DOM representation for each item in the array and ensuring
  that child views and their associated rendered HTML are updated when items in
  the array are added, removed, or replaced.

  ## Setting content

  The managed collection of objects is referenced as the `Ember.CollectionView`
  instance's `content` property.

  ```javascript
  someItemsView = Ember.CollectionView.create({
    content: ['A', 'B','C']
  })
  ```

  The view for each item in the collection will have its `content` property set
  to the item.

  ## Specifying `itemViewClass`

  By default the view class for each item in the managed collection will be an
  instance of `Ember.View`. You can supply a different class by setting the
  `CollectionView`'s `itemViewClass` property.

  Given the following application code:

  ```javascript
  var App = Ember.Application.create();
  App.ItemListView = Ember.CollectionView.extend({
    classNames: ['a-collection'],
    content: ['A','B','C'],
    itemViewClass: Ember.View.extend({
      template: Ember.Handlebars.compile("the letter: {{view.content}}")
    })
  });
  ```

  And a simple application template:

  ```handlebars
  {{view 'item-list'}}
  ```

  The following HTML will result:

  ```html
  <div class="ember-view a-collection">
    <div class="ember-view">the letter: A</div>
    <div class="ember-view">the letter: B</div>
    <div class="ember-view">the letter: C</div>
  </div>
  ```

  ## Automatic matching of parent/child tagNames

  Setting the `tagName` property of a `CollectionView` to any of
  "ul", "ol", "table", "thead", "tbody", "tfoot", "tr", or "select" will result
  in the item views receiving an appropriately matched `tagName` property.

  Given the following application code:

  ```javascript
  var App = Ember.Application.create();
  App.UnorderedListView = Ember.CollectionView.create({
    tagName: 'ul',
    content: ['A','B','C'],
    itemViewClass: Ember.View.extend({
      template: Ember.Handlebars.compile("the letter: {{view.content}}")
    })
  });
  ```

  And a simple application template:

  ```handlebars
  {{view 'unordered-list-view'}}
  ```

  The following HTML will result:

  ```html
  <ul class="ember-view a-collection">
    <li class="ember-view">the letter: A</li>
    <li class="ember-view">the letter: B</li>
    <li class="ember-view">the letter: C</li>
  </ul>
  ```

  Additional `tagName` pairs can be provided by adding to
  `Ember.CollectionView.CONTAINER_MAP`. For example:

  ```javascript
  Ember.CollectionView.CONTAINER_MAP['article'] = 'section'
  ```

  ## Programmatic creation of child views

  For cases where additional customization beyond the use of a single
  `itemViewClass` or `tagName` matching is required CollectionView's
  `createChildView` method can be overidden:

  ```javascript
  App.CustomCollectionView = Ember.CollectionView.extend({
    createChildView: function(viewClass, attrs) {
      if (attrs.content.kind == 'album') {
        viewClass = App.AlbumView;
      } else {
        viewClass = App.SongView;
      }
      return this._super(viewClass, attrs);
    }
  });
  ```

  ## Empty View

  You can provide an `Ember.View` subclass to the `Ember.CollectionView`
  instance as its `emptyView` property. If the `content` property of a
  `CollectionView` is set to `null` or an empty array, an instance of this view
  will be the `CollectionView`s only child.

  ```javascript
  var App = Ember.Application.create();
  App.ListWithNothing = Ember.CollectionView.create({
    classNames: ['nothing'],
    content: null,
    emptyView: Ember.View.extend({
      template: Ember.Handlebars.compile("The collection is empty")
    })
  });
  ```

  And a simple application template:

  ```handlebars
  {{view 'list-with-nothing'}}
  ```

  The following HTML will result:

  ```html
  <div class="ember-view nothing">
    <div class="ember-view">
      The collection is empty
    </div>
  </div>
  ```

  ## Adding and Removing items

  The `childViews` property of a `CollectionView` should not be directly
  manipulated. Instead, add, remove, replace items from its `content` property.
  This will trigger appropriate changes to its rendered HTML.


  @class CollectionView
  @namespace Ember
  @extends Ember.ContainerView
  @since Ember 0.9
*/
var CollectionView = ContainerView.extend({

  /**
    A list of items to be displayed by the `Ember.CollectionView`.

    @property content
    @type Ember.Array
    @default null
  */
  content: null,

  /**
    This provides metadata about what kind of empty view class this
    collection would like if it is being instantiated from another
    system (like Handlebars)

    @private
    @property emptyViewClass
  */
  emptyViewClass: View,

  /**
    An optional view to display if content is set to an empty array.

    @property emptyView
    @type Ember.View
    @default null
  */
  emptyView: null,

  /**
    @property itemViewClass
    @type Ember.View
    @default Ember.View
  */
  itemViewClass: View,

  /**
    Setup a CollectionView

    @method init
  */
  init: function() {
    var ret = this._super();
    this._contentDidChange();
    return ret;
  },

  /**
    Invoked when the content property is about to change. Notifies observers that the
    entire array content will change.

    @private
    @method _contentWillChange
  */
  _contentWillChange: beforeObserver('content', function() {
    var content = this.get('content');

    if (content) { content.removeArrayObserver(this); }
    var len = content ? get(content, 'length') : 0;
    this.arrayWillChange(content, 0, len);
  }),

  /**
    Check to make sure that the content has changed, and if so,
    update the children directly. This is always scheduled
    asynchronously, to allow the element to be created before
    bindings have synchronized and vice versa.

    @private
    @method _contentDidChange
  */
  _contentDidChange: observer('content', function() {
    var content = get(this, 'content');

    if (content) {
      this._assertArrayLike(content);
      content.addArrayObserver(this);
    }

    var len = content ? get(content, 'length') : 0;
    this.arrayDidChange(content, 0, null, len);
  }),

  /**
    Ensure that the content implements Ember.Array

    @private
    @method _assertArrayLike
  */
  _assertArrayLike: function(content) {
    Ember.assert(fmt("an Ember.CollectionView's content must implement Ember.Array. You passed %@", [content]), EmberArray.detect(content));
  },

  /**
    Removes the content and content observers.

    @method destroy
  */
  destroy: function() {
    if (!this._super()) { return; }

    var content = get(this, 'content');
    if (content) { content.removeArrayObserver(this); }

    if (this._createdEmptyView) {
      this._createdEmptyView.destroy();
    }

    return this;
  },

  /**
    Called when a mutation to the underlying content array will occur.

    This method will remove any views that are no longer in the underlying
    content array.

    Invokes whenever the content array itself will change.

    @method arrayWillChange
    @param {Array} content the managed collection of objects
    @param {Number} start the index at which the changes will occurr
    @param {Number} removed number of object to be removed from content
  */
  arrayWillChange: function(content, start, removedCount) {
    // If the contents were empty before and this template collection has an
    // empty view remove it now.
    var emptyView = get(this, 'emptyView');
    if (emptyView && emptyView instanceof View) {
      emptyView.removeFromParent();
    }

    // Loop through child views that correspond with the removed items.
    // Note that we loop from the end of the array to the beginning because
    // we are mutating it as we go.
    var childViews = this._childViews;
    var childView, idx;

    for (idx = start + removedCount - 1; idx >= start; idx--) {
      childView = childViews[idx];
      if (childView) {
        childView.destroy();
      }
    }
  },

  /**
    Called when a mutation to the underlying content array occurs.

    This method will replay that mutation against the views that compose the
    `Ember.CollectionView`, ensuring that the view reflects the model.

    This array observer is added in `contentDidChange`.

    @method arrayDidChange
    @param {Array} content the managed collection of objects
    @param {Number} start the index at which the changes occurred
    @param {Number} removed number of object removed from content
    @param {Number} added number of object added to content
  */
  arrayDidChange: function(content, start, removed, added) {
    var addedViews = [];
    var view, item, idx, len, itemViewClass, emptyView, viewsLen;

    viewsLen = get(this, 'length');
    len = content ? get(content, 'length') : 0;

    if (len) {
      if (len === viewsLen) {
        start = 0;
        added = len;
        this.replace(0, len, []);
      }
      itemViewClass = get(this, 'itemViewClass');
      itemViewClass = readViewFactory(itemViewClass, this.container);

      for (idx = start; idx < start+added; idx++) {
        item = content.objectAt(idx);

        view = this.createChildView(itemViewClass, {
          content: item,
          contentIndex: idx,
          _blockArguments: [item]
        });

        addedViews.push(view);
      }
    } else {
      emptyView = get(this, 'emptyView');

      if (!emptyView) { return; }

      if ('string' === typeof emptyView && isGlobalPath(emptyView)) {
        emptyView = get(emptyView) || emptyView;
      }

      emptyView = this.createChildView(emptyView);
      addedViews.push(emptyView);
      set(this, 'emptyView', emptyView);

      if (CoreView.detect(emptyView)) {
        this._createdEmptyView = emptyView;
      }
    }

    this.replace(start, 0, addedViews);
  },

  /**
    Instantiates a view to be added to the childViews array during view
    initialization. You generally will not call this method directly unless
    you are overriding `createChildViews()`. Note that this method will
    automatically configure the correct settings on the new view instance to
    act as a child of the parent.

    The tag name for the view will be set to the tagName of the viewClass
    passed in.

    @method createChildView
    @param {Class} viewClass
    @param {Hash} [attrs] Attributes to add
    @return {Ember.View} new instance
  */
  createChildView: function(view, attrs) {
    view = this._super(view, attrs);

    var itemTagName = get(view, 'tagName');

    if (itemTagName === null || itemTagName === undefined) {
      itemTagName = CollectionView.CONTAINER_MAP[get(this, 'tagName')];
      set(view, 'tagName', itemTagName);
    }

    return view;
  }
});

/**
  A map of parent tags to their default child tags. You can add
  additional parent tags if you want collection views that use
  a particular parent tag to default to a child tag.

  @property CONTAINER_MAP
  @type Hash
  @static
  @final
*/
CollectionView.CONTAINER_MAP = {
  ul: 'li',
  ol: 'li',
  table: 'tr',
  thead: 'tr',
  tbody: 'tr',
  tfoot: 'tr',
  tr: 'td',
  select: 'option'
};

export default CollectionView;
