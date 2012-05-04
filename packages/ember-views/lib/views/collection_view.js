// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-views/views/container_view');
require('ember-runtime/system/string');

var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;

/**
  @class

  `Ember.CollectionView` is an `Ember.View` descendent responsible for managing a
  collection (an array or array-like object) by maintaing a child view object and 
  associated DOM representation for each item in the array and ensuring that child
  views and their associated rendered HTML are updated when items in the array
  are added, removed, or replaced.

  ## Setting content
  The managed collection of objects is referenced as the `Ember.CollectionView` instance's
  `content` property.

      someItemsView = Ember.CollectionView.create({
        content: ['A', 'B','C']
      })

  The view for each item in the collection will have its `content` property set
  to the item.

  ## Specifying itemViewClass
  By default the view class for each item in the managed collection will be an instance
  of `Ember.View`. You can supply a different class by setting the `CollectionView`'s
  `itemViewClass` property.

  Given an empty `<body>` and the following code:


        someItemsView = Ember.CollectionView.create({
          classNames: ['a-collection'],
          content: ['A','B','C'],
          itemViewClass: Ember.View.extend({
            template: Ember.Handlebars.compile("the letter: {{content}}")
          })
        })

        someItemsView.appendTo('body')

  Will result in the following HTML structure

        <div class="ember-view a-collection">
          <div class="ember-view">the letter: A</div>
          <div class="ember-view">the letter: B</div>
          <div class="ember-view">the letter: C</div>
        </div>


  ## Automatic matching of parent/child tagNames
  Setting the `tagName` property of a `CollectionView` to any of 
  "ul", "ol", "table", "thead", "tbody", "tfoot", "tr", or "select" will result
  in the item views receiving an appropriately matched `tagName` property.


  Given an empty `<body>` and the following code:

        anUndorderedListView = Ember.CollectionView.create({
          tagName: 'ul',
          content: ['A','B','C'],
          itemViewClass: Ember.View.extend({
            template: Ember.Handlebars.compile("the letter: {{content}}")
          })
        })

        anUndorderedListView.appendTo('body')

  Will result in the following HTML structure

        <ul class="ember-view a-collection">
          <li class="ember-view">the letter: A</li>
          <li class="ember-view">the letter: B</li>
          <li class="ember-view">the letter: C</li>
        </ul>

  Additional tagName pairs can be provided by adding to `Ember.CollectionView.CONTAINER_MAP `

        Ember.CollectionView.CONTAINER_MAP['article'] = 'section'


  ## Empty View
  You can provide an `Ember.View` subclass to the `Ember.CollectionView` instance as its
  `emptyView` property. If the `content` property of a `CollectionView` is set to `null`
  or an empty array, an instance of this view will be the `CollectionView`s only child.

        aListWithNothing = Ember.CollectionView.create({
          classNames: ['nothing']
          content: null,
          emptyView: Ember.View.extend({
            template: Ember.Handlebars.compile("The collection is empty")
          })
        })

        aListWithNothing.appendTo('body')

  Will result in the following HTML structure

        <div class="ember-view nothing">
          <div class="ember-view">
            The collection is empty
          </div>
        </div>

  ## Adding and Removing items
  The `childViews` property of a `CollectionView` should not be directly manipulated. Instead,
  add, remove, replace items from its `content` property. This will trigger
  appropriate changes to its rendered HTML.

  ## Use in templates via the `{{collection}}` Ember.Handlebars helper
  Ember.Handlebars provides a helper specifically for adding `CollectionView`s to templates.
  See `Ember.Handlebars.collection` for more details

  @since Ember 0.9
  @extends Ember.ContainerView
*/
Ember.CollectionView = Ember.ContainerView.extend(
/** @scope Ember.CollectionView.prototype */ {

  /**
    A list of items to be displayed by the Ember.CollectionView.

    @type Ember.Array
    @default null
  */
  content: null,

  /**
    @private

    This provides metadata about what kind of empty view class this
    collection would like if it is being instantiated from another
    system (like Handlebars)
  */
  emptyViewClass: Ember.View,

  /**
    An optional view to display if content is set to an empty array.

    @type Ember.View
    @default null
  */
  emptyView: null,

  /**
    @type Ember.View
    @default Ember.View
  */
  itemViewClass: Ember.View,

  /** @private */
  init: function() {
    var ret = this._super();
    this._contentDidChange();
    return ret;
  },

  _contentWillChange: Ember.beforeObserver(function() {
    var content = this.get('content');

    if (content) { content.removeArrayObserver(this); }
    var len = content ? get(content, 'length') : 0;
    this.arrayWillChange(content, 0, len);
  }, 'content'),

  /**
    @private

    Check to make sure that the content has changed, and if so,
    update the children directly. This is always scheduled
    asynchronously, to allow the element to be created before
    bindings have synchronized and vice versa.
  */
  _contentDidChange: Ember.observer(function() {
    var content = get(this, 'content');

    if (content) {
      Ember.assert(fmt("an Ember.CollectionView's content must implement Ember.Array. You passed %@", [content]), Ember.Array.detect(content));
      content.addArrayObserver(this);
    }

    var len = content ? get(content, 'length') : 0;
    this.arrayDidChange(content, 0, null, len);
  }, 'content'),

  willDestroy: function() {
    var content = get(this, 'content');
    if (content) { content.removeArrayObserver(this); }

    this._super();
  },

  arrayWillChange: function(content, start, removedCount) {
    // If the contents were empty before and this template collection has an
    // empty view remove it now.
    var emptyView = get(this, 'emptyView');
    if (emptyView && emptyView instanceof Ember.View) {
      emptyView.removeFromParent();
    }

    // Loop through child views that correspond with the removed items.
    // Note that we loop from the end of the array to the beginning because
    // we are mutating it as we go.
    var childViews = get(this, 'childViews'), childView, idx, len;

    len = get(childViews, 'length');

    var removingAll = removedCount === len;

    if (removingAll) {
      this.invokeForState('empty');
    }

    for (idx = start + removedCount - 1; idx >= start; idx--) {
      childView = childViews[idx];
      if (removingAll) { childView.removedFromDOM = true; }
      childView.destroy();
    }
  },

  /**
    Called when a mutation to the underlying content array occurs.

    This method will replay that mutation against the views that compose the
    Ember.CollectionView, ensuring that the view reflects the model.

    This array observer is added in contentDidChange.

    @param {Array} addedObjects
      the objects that were added to the content

    @param {Array} removedObjects
      the objects that were removed from the content

    @param {Number} changeIndex
      the index at which the changes occurred
  */
  arrayDidChange: function(content, start, removed, added) {
    var itemViewClass = get(this, 'itemViewClass'),
        childViews = get(this, 'childViews'),
        addedViews = [], view, item, idx, len, itemTagName;

    if ('string' === typeof itemViewClass) {
      itemViewClass = Ember.getPath(itemViewClass);
    }

    Ember.assert(fmt("itemViewClass must be a subclass of Ember.View, not %@", [itemViewClass]), Ember.View.detect(itemViewClass));

    len = content ? get(content, 'length') : 0;
    if (len) {
      for (idx = start; idx < start+added; idx++) {
        item = content.objectAt(idx);

        view = this.createChildView(itemViewClass, {
          content: item,
          contentIndex: idx
        });

        addedViews.push(view);
      }
    } else {
      var emptyView = get(this, 'emptyView');
      if (!emptyView) { return; }

      emptyView = this.createChildView(emptyView);
      addedViews.push(emptyView);
      set(this, 'emptyView', emptyView);
    }
    childViews.replace(start, 0, addedViews);
  },

  createChildView: function(view, attrs) {
    view = this._super(view, attrs);

    var itemTagName = get(view, 'tagName');
    var tagName = (itemTagName === null || itemTagName === undefined) ? Ember.CollectionView.CONTAINER_MAP[get(this, 'tagName')] : itemTagName;

    set(view, 'tagName', tagName);

    return view;
  }
});

/**
  @static

  A map of parent tags to their default child tags. You can add
  additional parent tags if you want collection views that use
  a particular parent tag to default to a child tag.

  @type Hash
  @constant
*/
Ember.CollectionView.CONTAINER_MAP = {
  ul: 'li',
  ol: 'li',
  table: 'tr',
  thead: 'tr',
  tbody: 'tr',
  tfoot: 'tr',
  tr: 'td',
  select: 'option'
};
