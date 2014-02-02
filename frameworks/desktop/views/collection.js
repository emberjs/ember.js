// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/collection_view_delegate') ;
sc_require('views/list_item');

/**
  Special drag operation passed to delegate if the collection view proposes
  to perform a reorder event.

  @static
  @constant
*/
SC.DRAG_REORDER = 0x0010;

/**
  @class

  This class renders a collection of views based on the items array set
  as its content.  You will not use this class directly as it does not
  order the views in any manner.  Instead you will want to subclass
  SC.CollectionView or use one of its existing subclasses in SproutCore
  such as SC.ListView, which renders items in a vertical list or SC.GridView,
  which renders items in a grid.

  To use a CollectionView subclass, just create the view and set the 'content'
  property to an array of objects.  The collection view will create instances of
  the given exampleView class for each item in the array.  You can also bind to
  the selection property if you want to monitor the current selection.

  # Extreme Performance

  SC.CollectionView does not just naively render one view per item and
  instead is aggressively optimized to allow for collections of
  hundreds of thousands of items to perform as fast as only a few items.  In
  order to achieve this, first it only creates views and elements for the items
  currently visible.  Therefore, when overriding SC.CollectionView, it is
  critically important to implement `contentIndexesInRect` which should return
  only the indexes of those items that should appear within the visible rect.
  By returning only the indexes that are visible, SC.CollectionView can represent
  enormous collections with only a few views and elements.

  The second optimization, is that SC.CollectionView will pool and reuse the
  few views and elements that it does need to create.  Creating and destroying
  views incrementally hurts performance, so by reusing the same views over and
  over, the view can much more quickly alter the set of visible views.  As well,
  inserting and removing elements from the DOM takes more time than simply
  modifying the contents of the same elements over and over, which allows us to
  leave the DOM tree untouched.

  @extends SC.View
  @extends SC.CollectionViewDelegate
  @extends SC.CollectionContent
  @since SproutCore 0.9
*/
SC.CollectionView = SC.View.extend(SC.CollectionViewDelegate, SC.CollectionContent,
/** @scope SC.CollectionView.prototype */ {

  /**
    @type Array
    @default ['sc-collection-view']
    @see SC.View#classNames
  */
  classNames: ['sc-collection-view'],

  /**
    @type Array
    @default ['isActive']
  */
  displayProperties: ['isActive'],

  /**
    @type String
    @default 'collectionRenderDelegate'
  */
  renderDelegateName: 'collectionRenderDelegate',

  /**
    @type Number
    @default 200
  */
  ACTION_DELAY: 200,

  // ......................................
  // PROPERTIES
  //

  /**
    If `YES`, uses the experimental fast `CollectionView` path.

    *Note* The performance improvements in the experimental code have been
    integrated directly into SC.CollectionView.  If you have set this property
    to true, you should set it to false and refer to the class documentation
    explaining how to modify the performance boost behavior if necessary.

    Generally, no modifications should be necessary and you should see an
    immediate performance improvement in all collections, especially on
    mobile devices.

    @type Boolean
    @deprecated Version 1.10
    @default NO
  */
  useFastPath: NO,

  /**
    An array of content objects

    This array should contain the content objects you want the collection view
    to display.  An item view (based on the `exampleView` view class) will be
    created for each content object, in the order the content objects appear
    in this array.

    If you make the collection editable, the collection view will also modify
    this array using the observable array methods of `SC.Array`.

    Usually you will want to bind this property to a controller property
    that actually contains the array of objects you to display.

    @type SC.Array
    @default null
  */
  content: null,

  /** @private */
  contentBindingDefault: SC.Binding.multiple(),

  /**
    The current length of the content.

    @readonly
    @type Number
    @default 0
  */
  length: 0,

  /**
    The set of indexes that are currently tracked by the collection view.
    This property is used to determine the range of items the collection view
    should monitor for changes.

    The default implementation of this property returns an index set covering
    the entire range of the content.  It changes automatically whenever the
    length changes.

    Note that the returned index set for this property will always be frozen.
    To change the nowShowing index set, you must create a new index set and
    apply it.

    @field
    @type SC.IndexSet
    @observes length
    @observes clippingFrame
  */
  nowShowing: function() {
    // If there is an in-scroll clipping frame, use it.
    var clippingFrame = this._inScrollClippingFrame || this.get('clippingFrame');

    return this.computeNowShowing(clippingFrame);
  }.property('length', 'clippingFrame').cacheable(),

  /**
    Indexes of selected content objects.  This `SC.SelectionSet` is modified
    automatically by the collection view when the user changes the selection
    on the collection.

    Any item views representing content objects in this set will have their
    isSelected property set to `YES` automatically.

    @type SC.SelectionSet
    @default null
  */
  selection: null,

  /**
    Allow user to select content using the mouse and keyboard.

    Set this property to `NO` to disallow the user from selecting items. If you
    have items in your `selectedIndexes` property, they will still be reflected
    visually.

    @type Boolean
    @default YES
  */
  isSelectable: YES,

  /** @private */
  isSelectableBindingDefault: SC.Binding.bool(),

  /**
    Enable or disable the view.

    The collection view will set the `isEnabled` property of its item views to
    reflect the same view of this property.  Whenever `isEnabled` is false,
    the collection view will also be not selectable or editable, regardless of
    the settings for `isEditable` & `isSelectable`.

    @type Boolean
    @default YES
  */
  isEnabled: YES,

  /** @private */
  isEnabledBindingDefault: SC.Binding.bool(),

  /**
    Allow user to edit content views.

    Whenever `isEditable` is false, the user will not be able to reorder, add,
    or delete items regardless of the `canReorderContent` and `canDeleteContent`
    and `isDropTarget` properties.

    @type Boolean
    @default YES
  */
  isEditable: YES,

  /** @private */
  isEditableBindingDefault: SC.Binding.bool(),

  /**
    Allow user to reorder items using drag and drop.

    If true, the user can use drag and drop to reorder items in the list.
    If you also accept drops, this will allow the user to drop items into
    specific points in the list.  Otherwise items will be added to the end.

    When canReorderContent is true, item views will have the `isReorderable`
    property set to true (if the `isEditable` is true on the collection).

    @type Boolean
    @default NO
  */
  canReorderContent: NO,

  /** @private */
  canReorderContentBindingDefault: SC.Binding.bool(),

  /**
    Allow the user to delete items using the delete key

    If true the user will be allowed to delete selected items using the delete
    key.  Otherwise deletes will not be permitted.

    When canDeleteContent is true, item views will have the `isDeletable`
    property set to true (if the `isEditable` is true on the collection).

    @type Boolean
    @default NO
  */
  canDeleteContent: NO,

  /** @private */
  canDeleteContentBindingDefault: SC.Binding.bool(),

  /**
    Allow user to edit the content by double clicking on it or hitting return.
    This will only work if isEditable is `YES` and the item view implements
    the `beginEditing()` method.

    When canEditContent is true, item views will have the `isEditable`
    property set to true (if the `isEditable` is true on the collection).

    @type Boolean
  */
  canEditContent: NO,

  /** @private */
  canEditContentBindingDefault: SC.Binding.bool(),

  /**
    Accept drops for data other than reordering.

    Setting this property to return true when the view is instantiated will
    cause it to be registered as a drop target, activating the other drop
    machinery.

    @type Boolean
    @default NO
  */
  isDropTarget: NO,

  /**
    Use toggle selection instead of normal click behavior.

    If set to true, then selection will use a toggle instead of the normal
    click behavior.  Command modifiers will be ignored and instead clicking
    once will select an item and clicking on it again will deselect it.

    @type Boolean
    @default NO
  */
  useToggleSelection: NO,

  /**
    Trigger the action method on a single click.

    Normally, clicking on an item view in a collection will select the content
    object and double clicking will trigger the action method on the
    collection view.

    If you set this property to `YES`, then clicking on a view will both select
    it (if `isSelected` is true) and trigger the action method.

    Use this if you are using the collection view as a menu of items.

    @type Boolean
    @default NO
  */
  actOnSelect: NO,


  /**
    Select an item immediately on mouse down

    Normally as soon as you begin a click the item will be selected.

    In some UI scenarios, you might want to prevent selection until
    the mouse is released, so you can perform, for instance, a drag operation
    without actually selecting the target item.

    @type Boolean
    @default YES
  */
  selectOnMouseDown: YES,

  /**
    The view class to use when creating new item views.

    The collection view will automatically create an instance of the view
    class you set here for each item in its content array.  You should provide
    your own subclass for this property to display the type of content you
    want.

    The view you set here should understand the following properties, which
    it can use to alter its display:

    - `content` -- The content object from the content array your view should
      display.
    - `isEnabled` -- False if the view should appear disabled.
    - `isSelected` -- True if the view should appear selected.
    - `contentIndex` -- The current index of the view's content.
    - `isEditable` -- True if the view should appear editable by clicking on it
      or hitting the Return key.
    - `isReorderable` -- True if the view should appear reorderable by dragging
      it.
    - `isDeletable` -- True if the view should appear deletable, by clicking on
      a delete button within it or hitting the Delete key.

    # Working with View and Element Pooling

    As noted in the SC.CollectionView description above, by default the few
    instances that are needed of the exampleView class will be created and then
    reused.  Reusing an exampleView means that the content, isSelected, isEnabled,
    isEditable, isReorderable, isDeletable and contentIndex properties will be
    updated as an existing view is pulled from the pool to be displayed.

    If your custom exampleView class has trouble being reused, you may want to
    implement the `sleepInPool` and `awakeFromPool` methods in your exampleView.
    These two methods will be called on the view, one before it is pooled,
    sleepInPool, and the other before it is unpooled, awakeFromPool.  For
    example, if your item views have images and there is a delay for new
    images to appear, you may want to use sleepInPool to ensure the previous
    image is unloaded so it doesn't appear momentarily while the new image loads.

    Also, if the rendered output of your exampleView does not update properly you
    can disable reuse of the layer by setting `isLayerReusable` to false.  This
    will reduce the performance of your collection though and it is recommended
    that you instead look at ways to properly update the existing layer as the
    content changes.

    Finally, if you really don't want view or element reuse at all, you may
    disable them both by setting `isReusable` to false in your exampleView class.
    Your collection will still benefit greatly from incremental rendering, but
    it will perform slightly less well than with optimal re-use.

    # Event handling

    In general you do not want your child views to actually respond to mouse
    and keyboard events themselves.  It is better to let the collection view
    do that.

    If you do implement your own event handlers such as mouseDown or mouseUp,
    you should be sure to actually call the same method on the collection view
    to give it the chance to perform its own selection housekeeping.

    @type SC.View
    @default SC.View
  */
  exampleView: SC.View,

  /**
    If set, this key will be used to get the example view for a given
    content object.  The exampleView property will be ignored.

    @type String
    @default null
  */
  contentExampleViewKey: null,

  /**
    The view class to use when creating new group item views.

    The collection view will automatically create an instance of the view
    class you set here for each item in its content array.  You should provide
    your own subclass for this property to display the type of content you
    want.

    If you leave this set to null then the regular example view will be used
    with the isGroupView property set to YES on the item view.

    @type SC.View
    @default null
  */
  groupExampleView: null,

  /**
    If set, this key will be used to get the example view for a given
    content object.  The `groupExampleView` property will be ignored.

    @type String
    @default null
  */
  contentGroupExampleViewKey: null,

  /**
    Invoked when the user double clicks on an item (or single clicks of
    actOnSelect is true)

    Set this to the name of the action you want to send down the
    responder chain when the user double clicks on an item (or single clicks
    if `actOnSelect` is true).  You can optionally specify a specific target as
    well using the target property.

    If you do not specify an action, then the collection view will also try to
    invoke the action named on the target item view.

    Older versions of SproutCore expected the action property to contain an
    actual function that would be run.  This format is still supported but is
    deprecated for future use.  You should generally use the responder chain
    to handle your action for you.

    @type String
    @default null
  */
  action: null,

  /**
    Optional target to send the action to when the user double clicks.

    If you set the action property to the name of an action, you can
    optionally specify the target object you want the action to be sent to.
    This can be either an actual object or a property path that will resolve
    to an object at the time that the action is invoked.

    This property is ignored if you use the deprecated approach of making the
    action property a function.

    @type String|Object
    @default null
  */
  target: null,

  /**
    Invoked when the user single clicks on the right icon of an item.

    Set this to the name of the action you want to send down the
    responder chain when the user single clicks on the right icon of an item
    You can optionally specify a specific target as
    well using the rightIconTarget property.

    @type String
    @default null
  */
  rightIconAction: null,

  /**
    Optional target to send the action to when the user clicks on the right icon
    of an item.

    If you set the rightIconAction property to the name of an action, you can
    optionally specify the target object you want the action to be sent to.
    This can be either an actual object or a property path that will resolve
    to an object at the time that the action is invoked.

    @type String|Object
    @default null
  */
  rightIconTarget: null,

  /**
    Property on content items to use for display.

    Built-in item views such as the `LabelView`s and `ImageView`s will use the
    value of this property as a key on the content object to determine the
    value they should display.

    For example, if you set `contentValueKey` to 'name' and set the
    exampleView to an `SC.LabelView`, then the label views created by the
    collection view will display the value of the content.name.

    If you are writing your own custom item view for a collection, you can
    get this behavior automatically by including the SC.Control mixin on your
    view.  You can also ignore this property if you like.  The collection view
    itself does not use this property to impact rendering.

    @type String
    @default null
  */
  contentValueKey: null,

  /**
    Enables keyboard-based navigate, deletion, etc. if set to true.

    @type Boolean
    @default NO
  */
  acceptsFirstResponder: NO,

  /**
    Changing this property value by default will cause the `CollectionView` to
    add/remove an 'active' class name to the root element.

    @type Boolean
    @default NO
  */
  isActive: NO,


  /**
    This property is used to store the calculated height to have
    a consistent scrolling behavior due to the issues generated by using top
    instead of `scrollTop`. We could look at the min-height set in the view, but
    to avoid performance hits we simply store it and the scrollView will use it if
    different than 0.

    @type Number
    @default 0
  */
  calculatedHeight: 0,

  /**
    This property is used to store the calculated width to have
    a consistent scrolling behavior due to the issues generated by using left
    instead of `scrollLeft`. We could look at the min-width set in the view, but
    to avoid performance hits we simply store it and the scrollView will use it if
    different than 0.

    @type Number
    @default 0
  */
  calculatedWidth: 0,


  // ..........................................................
  // SUBCLASS METHODS
  //

  /**
    Adjusts the layout of the view according to the computed layout.  Call
    this method to apply the computed layout to the view.
  */
  adjustLayout: function () {
    var layout = this.computeLayout();
    if (layout) { this.adjust(layout); }
  },

  /**
    Override to return the computed layout dimensions of the collection view.
    You can omit any dimensions you don't care about setting in your
    computed value.

    This layout is automatically applied whenever the content changes.

    If you don't care about computing the layout at all, you can return null.

    @returns {Hash} layout properties
  */
  computeLayout: function() {
    return null;
  },

  /**
    Override to compute the layout of the itemView for the content at the
    specified index.  This layout will be applied to the view just before it
    is rendered.

    @param {Number} contentIndex the index of content being rendered by
      itemView
    @returns {Hash} a view layout
  */
  layoutForContentIndex: function(contentIndex) {
    return null;
  },

  /**
    This computed property returns an index set selecting all content indexes.
    It will recompute anytime the length of the collection view changes.

    This is used by the default `contentIndexesInRect()` implementation.

    @field
    @type SC.IndexSet
    @observes length
  */
  allContentIndexes: function() {
    return SC.IndexSet.create(0, this.get('length')).freeze();
  }.property('length').cacheable(),

  /**
    Override to return an IndexSet with the indexes that are at least
    partially visible in the passed rectangle.  This method is used by the
    default implementation of `computeNowShowing()` to determine the new
    `nowShowing` range after a scroll.

    Override this method to implement incremental rendering.

    @param {Rect} rect the visible rect
    @returns {SC.IndexSet} now showing indexes
  */
  contentIndexesInRect: function(rect) {
    return null; // select all
  },

  /**
    Compute the nowShowing index set.  The default implementation simply
    returns the full range.  Override to implement incremental rendering.

    You should not normally call this method yourself.  Instead get the
    nowShowing property.

    @returns {SC.IndexSet} new now showing range
  */
  computeNowShowing: function (clippingFrame) {
    var r = this.contentIndexesInRect(clippingFrame);
    if (!r) r = this.get('allContentIndexes'); // default show all

    // make sure the index set doesn't contain any indexes greater than the
    // actual content.
    else {
      var len = this.get('length'),
          max = r.get('max');
      if (max > len) r = r.copy().remove(len, max-len).freeze();
    }

    return r;
  },

  /**
    Override to show the insertion point during a drag.

    Called during a drag to show the insertion point.  Passed value is the
    item view that you should display the insertion point before.  If the
    passed value is `null`, then you should show the insertion point *AFTER* that
    last item view returned by the itemViews property.

    Once this method is called, you are guaranteed to also receive a call to
    `hideInsertionPoint()` at some point in the future.

    The default implementation of this method does nothing.

    @param itemView {SC.ClassicView} view the insertion point should appear directly before. If null, show insertion point at end.
    @param dropOperation {Number} the drop operation.  will be SC.DROP_BEFORE, SC.DROP_AFTER, or SC.DROP_ON

    @returns {void}
  */
  showInsertionPoint: function(itemView, dropOperation) {},

  /**
    Override to hide the insertion point when a drag ends.

    Called during a drag to hide the insertion point.  This will be called
    when the user exits the view, cancels the drag or completes the drag.  It
    will not be called when the insertion point changes during a drag.

    You should expect to receive one or more calls to
    `showInsertionPointBefore()` during a drag followed by at least one call to
    this method at the end.  Your method should not raise an error if it is
    called more than once.

    @returns {void}
  */
  hideInsertionPoint: function() {},


  // ..........................................................
  // DELEGATE SUPPORT
  //


  /**
    Delegate used to implement fine-grained control over collection view
    behaviors.

    You can assign a delegate object to this property that will be consulted
    for various decisions regarding drag and drop, selection behavior, and
    even rendering.  The object you place here must implement some or all of
    the `SC.CollectionViewDelegate` mixin.

    If you do not supply a delegate but the content object you set implements
    the `SC.CollectionViewDelegate` mixin, then the content will be
    automatically set as the delegate.  Usually you will work with a
    `CollectionView` in this way rather than setting a delegate explicitly.

    @type SC.CollectionViewDelegate
    @default null
  */
  delegate: null,

  /**
    The delegate responsible for handling selection changes.  This property
    will be either the delegate, content, or the collection view itself,
    whichever implements the `SC.CollectionViewDelegate` mixin.

    @field
    @type Object
  */
  selectionDelegate: function() {
    var del = this.get('delegate'), content = this.get('content');
    return this.delegateFor('isCollectionViewDelegate', del, content);
  }.property('delegate', 'content').cacheable(),

  /**
    The delegate responsible for providing additional display information
    about the content.  If you bind a collection view to a controller, this
    the content will usually also be the content delegate, though you
    could implement your own delegate if you prefer.

    @field
    @type Object
  */
  contentDelegate: function() {
    var del = this.get('delegate'), content = this.get('content');
    return this.delegateFor('isCollectionContent', del, content);
  }.property('delegate', 'content').cacheable(),


  // ..........................................................
  // CONTENT CHANGES
  //

  /**
    Called whenever the content array or an item in the content array or a
    property on an item in the content array changes.  Reloads the appropriate
    item view when the content array itself changes or calls
    `contentPropertyDidChange()` if a property changes.

    Normally you will not call this method directly though you may override
    it if you need to change the way changes to observed ranges are handled.

    @param {SC.Array} content the content array generating the change
    @param {Object} object the changed object
    @param {String} key the changed property or '[]' or an array change
    @param {SC.IndexSet} indexes affected indexes or null for all items
    @returns {void}
  */
  contentRangeDidChange: function(content, object, key, indexes) {
    if (!object && (key === '[]')) {
      this.notifyPropertyChange('_contentGroupIndexes');
      this.reload(indexes); // note: if indexes == null, reloads all
    } else {
      this.contentPropertyDidChange(object, key, indexes);
    }
  },

  /**
    Called whenever a property on an item in the content array changes.  This
    is only called if you have set `observesContentProperties` to `YES`.

    Override this property if you want to do some custom work whenever a
    property on a content object changes.

    The default implementation does nothing.

    @param {Object} target the object that changed
    @param {String} key the property that changed value
    @param {SC.IndexSet} indexes the indexes in the content array affected
    @returns {void}
  */
  contentPropertyDidChange: function(target, key, indexes) {},

  /**
    Called whenever the view needs to updates its `contentRangeObserver` to
    reflect the current nowShowing index set.  You will not usually call this
    method yourself but you may override it if you need to provide some
    custom range observer behavior.

    Note that if you do implement this method, you are expected to maintain
    the range observer object yourself.  If a range observer has not been
    created yet, this method should create it.  If an observer already exists
    this method should update it.

    When you create a new range observer, the observer must eventually call
    `contentRangeDidChange()` for the collection view to function properly.

    If you override this method you probably also need to override
    `destroyRangeObserver()` to cleanup any existing range observer.

    @returns {void}
  */
  updateContentRangeObserver: function() {
    var nowShowing = this.get('nowShowing'),
        observer   = this._cv_contentRangeObserver,
        content    = this.get('content');

    if (!content) return ; // nothing to do

    if (observer) {
      content.updateRangeObserver(observer, nowShowing);
    } else {
      var func = this.contentRangeDidChange;
      observer = content.addRangeObserver(nowShowing, this, func, null);

      // Cache the range observer so we can clean it up later.
      this._cv_contentRangeObserver = observer ;
    }

  },

  /**
    Called whever the view needs to invalidate the current content range
    observer.  This is called whenever the content array changes.  You will
    not usually call this method yourself but you may override it if you
    provide your own range observer behavior.

    Note that if you override this method you should probably also override
    `updateRangeObserver()` to create or update a range observer as needed.

    @returns {void}
  */
  removeContentRangeObserver: function() {
    var content  = this.get('content'),
        observer = this._cv_contentRangeObserver ;

    if (observer) {
      if (content) content.removeRangeObserver(observer);
      this._cv_contentRangeObserver = null ;
    }
  },

  /**
    Called whenever the content length changes.  This will invalidate the
    length property of the view itself causing the `nowShowing` to recompute
    which will in turn update the UI accordingly.

    @returns {void}
  */
  contentLengthDidChange: function() {
    var content = this.get('content');
    this.set('length', content ? content.get('length') : 0);
    this.invokeOnce(this.adjustLayout);
  },

  /** @private
    Whenever content property changes to a new value:

      - remove any old observers
      - setup new observers (maybe wait until end of runloop to do this?)
      - recalc height/reload content
      - set content as delegate if delegate was old content
      - reset selection

    Whenever content array mutates:

      - possibly stop observing property changes on objects, observe new objs
      - reload effected item views
      - update layout for receiver
  */
  _cv_contentDidChange: function() {
    var content = this.get('content'),
        lfunc   = this.contentLengthDidChange ;

    if (content === this._content) return; // nothing to do

    // cleanup old content
    this.removeContentRangeObserver();
    if (this._content) {
      this._content.removeObserver('length', this, lfunc);
    }

    // Destroy all pooled views.
    if (this._pools) {
      for (var key in this._pools) {
        this._pools[key].invoke('destroy');
      }
      delete this._pools;
    }

    // cache
    this._content = content;

    // add new observers - range observer will be added lazily
    if (content) {
      content.addObserver('length', this, lfunc);
    }

    // notify all items changed
    this.contentLengthDidChange();
    this.contentRangeDidChange(content, null, '[]', null);
  }.observes('content'),

  // ..........................................................
  // ITEM VIEWS
  //

  /** @private
    The indexes that need to be reloaded.  Must be one of YES, NO, or an
    SC.IndexSet.
  */
  _invalidIndexes: NO,

  /** @private
    We need to reload if isEnabled, isEditable, canEditContent, canReorderContent or
    canDeleteContent change.
  */
  _isEnabledDidChange: function () {
    // Reload the nowShowing indexes.
    this.reload();
  }.observes('isEnabled', 'isEditable', 'canEditContent', 'canReorderContent', 'canDeleteContent'),

  /**
    Regenerates the item views for the content items at the specified indexes.
    If you pass null instead of an index set, regenerates all item views.

    This method is called automatically whenever the content array changes in
    an observable way, but you can call its yourself also if you need to
    refresh the collection view for some reason.

    Note that if the length of the content is shorter than the child views
    and you call this method, then the child views will be removed no matter
    what the index.

    @param {SC.IndexSet} indexes
    @returns {SC.CollectionView} receiver
  */
  reload: function(indexes) {
    var invalid = this._invalidIndexes,
      length;

    if (indexes && invalid !== YES) {
      if (invalid) invalid.add(indexes);
      else invalid = this._invalidIndexes = indexes.clone();

      // If the last item in the list changes, we need to reload the previous last
      // item also so that the isLast attribute updates appropriately.
      length = this.get('length');
      if (length > 1 && invalid.max == length) {
        invalid.add(length - 2);
    }
    }
    else {
      this._invalidIndexes = YES ; // force a total reload
    }

    if (this.get('isVisibleInWindow')) this.invokeOnce(this.reloadIfNeeded);

    return this ;
  },

  /**
    Invoked once per runloop to actually reload any needed item views.
    You can call this method at any time to actually force the reload to
    happen immediately if any item views need to be reloaded.

    @returns {SC.CollectionView} receiver
  */
  reloadIfNeeded: function() {
    var invalid = this._invalidIndexes;
    if (!invalid || !this.get('isVisibleInWindow')) return this ; // delay
    this._invalidIndexes = NO ;

    var len, existing,
        nowShowing = this.get('nowShowing'),
      itemViews = this._sc_itemViews || [],
      idx;

    // if the set is defined but it contains the entire nowShowing range, just
    // replace
    if (invalid.isIndexSet && invalid.contains(nowShowing)) invalid = YES ;

    // if an index set, just update indexes
    if (invalid.isIndexSet) {

      // Go through the invalid indexes and determine if the matching views
      // should be redrawn (exists and still showing), should be created (
      // doesn't exist and now showing) or should be destroyed (exists and no
      // longer showing).
      invalid.forEach(function(idx) {
        // Get the existing item view, if there is one.
        existing = itemViews[idx];
        if (existing) {
          // Exists so remove it (may send to pool).
          this._removeItemView(existing, idx);
        }

        // Create it (may fetch from pool).
        if (nowShowing.contains(idx)) {
          this.itemViewForContentIndex(idx, YES);
          }
      },this);

    // if set is NOT defined, replace entire content with nowShowing
    } else {

      // Process the removals.
      for (idx = 0, len = itemViews.length;  idx < len; idx++) {
        // Get the existing item view, if there is one.
        existing = itemViews ? itemViews[idx] : null;
        if (existing) {
          this._removeItemView(existing, idx);
          }
        }

      // Only after the children are removed should we create the new views.
      // We do this in order to maximize the chance of re-use should the view
      // be marked as such.
      nowShowing.forEach(function(idx) {
        this.itemViewForContentIndex(idx, YES);
      }, this);
    }

    return this ;
  },

  /** @private */
  _TMP_ATTRS: {},

  /** @private
    The item view classes, cached here for performance. Note that if these ever change, they may
    also need to be updated in the isGroupView code block in _reconfigureItemView below.
  */
  _COLLECTION_CLASS_NAMES: ['sc-collection-item', 'sc-item'],

  /** @private
    The group view classes, cached here for performance. Note that if these ever change, they may
    also need to be updated in the isGroupView code block in _reconfigureItemView below.
  */
  _GROUP_COLLECTION_CLASS_NAMES: ['sc-collection-item', 'sc-group-item'],

  /**
    Returns the item view for the content object at the specified index. Call
    this method instead of accessing child views directly whenever you need
    to get the view associated with a content index.

    Although this method take two parameters, you should almost always call
    it with just the content index.  The other two parameters are used
    internally by the CollectionView.

    If you need to change the way the collection view manages item views
    you can override this method as well.  If you just want to change the
    default options used when creating item views, override createItemView()
    instead.

    Note that if you override this method, then be sure to implement this
    method so that it uses a cache to return the same item view for a given
    index unless "force" is YES.  In that case, generate a new item view and
    replace the old item view in your cache with the new item view.

    @param {Number} idx the content index
    @param {Boolean} rebuild internal use only
    @returns {SC.View} instantiated view
  */
  itemViewForContentIndex: function(idx, rebuild) {
    var ret,
      views;

    // Initialize internal views cache.
    views = this._sc_itemViews;
    if (!views) { views = this._sc_itemViews = []; }

    // Use an existing view for this index if we have it and aren't rebuilding all.
    ret = views[idx];
    if (ret) {
      if (rebuild) {
        ret.destroy();
        ret = null;
    } else {
        return ret;
    }
    }

    var attrs,
      containerView = this.get('containerView') || this,
      exampleView,
      pool,
      prototype;

    // Set up the attributes for the view.
    attrs = this._attrsForContentIndex(idx);

    // If the view is reusable and there is an appropriate view inside the
    // pool, simply reuse it to avoid having to create a new view.
    exampleView = this._exampleViewForContentIndex(idx);
    prototype = exampleView.prototype;
    if (SC.none(prototype.isReusable) || prototype.isReusable) {
      pool = this._poolForExampleView(exampleView);

      // Is there a view we can re-use?
      if (pool.length > 0) {
        ret = pool.shift();

        // Reconfigure the view.
        this._reconfigureItemView(ret, attrs);

        // Awake the view.
        if (ret.awakeFromPool) { ret.awakeFromPool(this); }

        // Recreate the layer if it was destroyed.
        if (!ret.get('_isRendered')) {
          ret.invokeOnce(ret._doRender);
        }
        }
      }

    // If we weren't able to re-use a view, then create a new one.
    if (!ret) {
      ret = this.createItemView(exampleView, idx, attrs);
      containerView.insertBefore(ret, null);   // Equivalent to 'append()', but avoids one more function call
      }

    views[idx] = ret;
    return ret ;
  },

  /**
    Convenience method for getting the item view of a content object.

    @param {Object} object
  */
  itemViewForContentObject: function(object) {
    var content = this.get('content');
    if (!content) return null;
    var contentIndex = content.indexOf(object);
    if (contentIndex === -1) return null;
    return this.itemViewForContentIndex(contentIndex);
  },

  /** @private */
  _TMP_LAYERID: [],

  /**
    Primitive to instantiate an item view.  You will be passed the class
    and a content index.  You can override this method to perform any other
    one time setup.

    Note that item views may be created somewhat frequently so keep this fast.

    *IMPORTANT:* The attrs hash passed is reused each time this method is
    called.   If you add properties to this hash be sure to delete them before
    returning from this method.

    @param {Class} exampleClass example view class
    @param {Number} idx the content index
    @param {Hash} attrs expected attributes
    @returns {SC.View} item view instance
  */
  createItemView: function(exampleClass, idx, attrs) {
    return exampleClass.create(attrs);
  },

  /**
    Generates a layerId for the passed index and item.  Usually the default
    implementation is suitable.

    @param {Number} idx the content index
    @returns {String} layer id, must be suitable for use in HTML id attribute
  */
  layerIdFor: function(idx) {
    var ret = this._TMP_LAYERID;
    ret[0] = SC.guidFor(this);
    ret[1] = idx;
    return ret.join('-');
  },

  /**
    Extracts the content index from the passed layerId.  If the layer id does
    not belong to the receiver or if no value could be extracted, returns NO.

    @param {String} id the layer id
  */
  contentIndexForLayerId: function(id) {
    if (!id || !(id = id.toString())) return null ; // nothing to do

    var base = this._baseLayerId;
    if (!base) base = this._baseLayerId = SC.guidFor(this)+"-";

    // no match
    if ((id.length <= base.length) || (id.indexOf(base) !== 0)) return null ;
    var ret = Number(id.slice(id.lastIndexOf('-')+1));
    return isNaN(ret) ? null : ret ;
  },


  /**
    Find the first content item view for the passed event.

    This method will go up the view chain, starting with the view that was the
    target of the passed event, looking for a child item.  This will become
    the view that is selected by the mouse event.

    This method only works for mouseDown & mouseUp events.  mouseMoved events
    do not have a target.

    @param {SC.Event} evt An event
    @returns {SC.View} the item view or null
  */
  itemViewForEvent: function(evt) {
    var responder = this.getPath('pane.rootResponder') ;
    if (!responder) return null ; // fast path

    var element = evt.target,
        layer   = this.get('layer'),
        contentIndex = null,
        id;

    // walk up the element hierarchy until we find this or an element with an
    // id matching the base guid (i.e. a collection item)
    while (element && element !== document && element !== layer) {
      id = element ? SC.$(element).attr('id') : null ;
      if (id && (contentIndex = this.contentIndexForLayerId(id)) !== null) {
          break;
      }
      element = element.parentNode ;
    }

    // no matching element found?
    if (contentIndex===null || (element === layer)) {
      element = layer = null; // avoid memory leaks
      return null;
    }

    // okay, found the DOM node for the view, go ahead and create it
    // first, find the contentIndex
    if (contentIndex >= this.get('length')) {
      throw new Error("layout for item view %@ was found when item view does not exist (%@)".fmt(id, this));
    }

    return this.itemViewForContentIndex(contentIndex);
  },

  // ..........................................................
  // DISCLOSURE SUPPORT
  //

  /**
    Expands any items in the passed selection array that have a disclosure
    state.

    @param {SC.IndexSet} indexes the indexes to expand
    @returns {SC.CollectionView} receiver
  */
  expand: function(indexes) {
    if (!indexes) return this; // nothing to do
    var del     = this.get('contentDelegate'),
        content = this.get('content');

    indexes.forEach(function(i) {
      var state = del.contentIndexDisclosureState(this, content, i);
      if (state === SC.BRANCH_CLOSED) del.contentIndexExpand(this,content,i);
    }, this);
    return this;
  },

  /**
    Collapses any items in the passed selection array that have a disclosure
    state.

    @param {SC.IndexSet} indexes the indexes to expand
    @returns {SC.CollectionView} receiver
  */
  collapse: function(indexes) {
    if (!indexes) return this; // nothing to do
    var del     = this.get('contentDelegate'),
        content = this.get('content');

    indexes.forEach(function(i) {
      var state = del.contentIndexDisclosureState(this, content, i);
      if (state === SC.BRANCH_OPEN) del.contentIndexCollapse(this,content,i);
    }, this);
    return this;
  },

  // ..........................................................
  // SELECTION SUPPORT
  //

  /** @private
    Called whenever the selection object is changed to a new value.  Begins
    observing the selection for changes.
  */
  _cv_selectionDidChange: function() {
    var sel  = this.get('selection'),
        last = this._cv_selection,
        func = this._cv_selectionContentDidChange;

    if (sel === last) return; // nothing to do
    if (last) last.removeObserver('[]', this, func);
    if (sel) sel.addObserver('[]', this, func);

    this._cv_selection = sel ;
    this._cv_selectionContentDidChange();
  }.observes('selection'),

  /** @private
    Called whenever the selection object or its content changes.  This will
    repaint any items that changed their selection state.
  */
  _cv_selectionContentDidChange: function() {
    var sel  = this.get('selection'),
        last = this._cv_selindexes, // clone of last known indexes
        content = this.get('content'),
        diff ;

    // save new last
    this._cv_selindexes = sel ? sel.frozenCopy() : null;

    // determine which indexes are now invalid
    if (last) last = last.indexSetForSource(content);
    if (sel) sel = sel.indexSetForSource(content);

    if (sel && last) diff = sel.without(last).add(last.without(sel));
    else diff = sel || last;

    if (diff && diff.get('length')>0) this.reloadSelectionIndexes(diff);
  },

  /** @private
    Contains the current item views that need their selection to be repainted.
    This may be either NO, YES, or an IndexSet.
  */
  _invalidSelection: NO,

  /**
    Called whenever the selection changes.  The passed index set will contain
    any affected indexes including those indexes that were previously
    selected and now should be deselected.

    Pass null to reload the selection state for all items.

    @param {SC.IndexSet} indexes affected indexes
    @returns {SC.CollectionView} receiver
  */
  reloadSelectionIndexes: function(indexes) {
    var invalid = this._invalidSelection ;
    if (indexes && (invalid !== YES)) {
      if (invalid) { invalid.add(indexes) ; }
      else { invalid = this._invalidSelection = indexes.copy(); }

    } else this._invalidSelection = YES ; // force a total reload

    if (this.get('isVisibleInWindow')) {
      this.invokeOnce(this.reloadSelectionIndexesIfNeeded);
    }

    return this ;
  },

  /**
    Reloads the selection state if needed on any dirty indexes.  Normally this
    will run once at the end of the runloop, but you can force the item views
    to reload their selection immediately by calling this method.

    You can also override this method if needed to change the way the
    selection is reloaded on item views.  The default behavior will simply
    find any item views in the nowShowing range that are affected and
    modify them.

    @returns {SC.CollectionView} receiver
  */
  reloadSelectionIndexesIfNeeded: function() {
    var invalid = this._invalidSelection;
    if (!invalid || !this.get('isVisibleInWindow')) return this ;

    var nowShowing = this.get('nowShowing'),
        reload     = this._invalidIndexes,
        content    = this.get('content'),
        sel        = this.get('selection');

    this._invalidSelection = NO; // reset invalid

    // fast path.  if we are going to reload everything anyway, just forget
    // about it.  Also if we don't have a nowShowing, nothing to do.
    if (reload === YES || !nowShowing) return this ;

    // if invalid is YES instead of index set, just reload everything
    if (invalid === YES) invalid = nowShowing;

    // if we will reload some items anyway, don't bother
    if (reload && reload.isIndexSet) invalid = invalid.without(reload);

    // iterate through each item and set the isSelected state.
    invalid.forEach(function(idx) {
      if (!nowShowing.contains(idx)) return; // not showing
      var view = this.itemViewForContentIndex(idx, NO);
      if (view) view.set('isSelected', sel ? sel.contains(content, idx) : NO);
    },this);

    return this ;
  },

  /**
    Selection primitive.  Selects the passed IndexSet of items, optionally
    extending the current selection.  If extend is NO or not passed then this
    will replace the selection with the passed value.  Otherwise the indexes
    will be added to the current selection.

    @param {Number|SC.IndexSet} indexes index or indexes to select
    @param extend {Boolean} optionally extend the selection
    @returns {SC.CollectionView} receiver
  */
  select: function(indexes, extend) {
    var content = this.get('content'),
        del     = this.get('selectionDelegate'),
        groupIndexes = this.get('_contentGroupIndexes'),
        sel;

    if (!this.get('isSelectable') || !this.get('isEnabledInPane')) return this;

    // normalize
    if (SC.typeOf(indexes) === SC.T_NUMBER) {
      indexes = SC.IndexSet.create(indexes, 1);
    }

    // if we are passed an empty index set or null, clear the selection.
    if (indexes && indexes.get('length')>0) {

      // first remove any group indexes - these can never be selected
      if (groupIndexes && groupIndexes.get('length')>0) {
        indexes = indexes.copy().remove(groupIndexes);
      }

      // give the delegate a chance to alter the items
      indexes = del.collectionViewShouldSelectIndexes(this, indexes, extend);
      if (!indexes || indexes.get('length')===0) return this; // nothing to do

    } else indexes = null;

    // build the selection object, merging if needed
    if (extend && (sel = this.get('selection'))) sel = sel.copy();
    else sel = SC.SelectionSet.create();

    if (indexes && indexes.get('length')>0) {

      // when selecting only one item, always select by content
      if (indexes.get('length')===1) {
        sel.addObject(content.objectAt(indexes.get('firstObject')));

      // otherwise select an index range
      } else sel.add(content, indexes);

    }

    // give delegate one last chance
    sel = del.collectionViewSelectionForProposedSelection(this, sel);
    if (!sel) sel = SC.SelectionSet.create(); // empty

    // if we're not extending the selection, clear the selection anchor
    this._selectionAnchor = null ;
    this.set('selection', sel.freeze()) ;
    return this;
  },

  /**
    Primitive to remove the indexes from the selection.

    @param {Number|SC.IndexSet} indexes index or indexes to deselect
    @returns {SC.CollectionView} receiver
  */
  deselect: function(indexes) {
    var sel     = this.get('selection'),
        content = this.get('content'),
        del     = this.get('selectionDelegate');

    if (!this.get('isSelectable') || !this.get('isEnabledInPane')) return this;
    if (!sel || sel.get('length')===0) return this; // nothing to do

    // normalize
    if (SC.typeOf(indexes) === SC.T_NUMBER) {
      indexes = SC.IndexSet.create(indexes, 1);
    }

    // give the delegate a chance to alter the items
    indexes = del.collectionViewShouldDeselectIndexes(this, indexes) ;
    if (!indexes || indexes.get('length')===0) return this; // nothing to do

    // now merge change - note we expect sel && indexes to not be null
    sel = sel.copy().remove(content, indexes);
    sel = del.collectionViewSelectionForProposedSelection(this, sel);
    if (!sel) sel = SC.SelectionSet.create(); // empty

    this.set('selection', sel.freeze()) ;
    return this ;
  },

  /** @private
   Finds the next selectable item, up to content length, by asking the
   delegate. If a non-selectable item is found, the index is skipped. If
   no item is found, selection index is returned unmodified.

   Return value will always be in the range of the bottom of the current
   selection index and the proposed index.

   @param {Number} proposedIndex the desired index to select
   @param {Number} bottom optional bottom of selection use as fallback
   @returns {Number} next selectable index.
  */
  _findNextSelectableItemFromIndex: function(proposedIndex, bottom) {
    var lim     = this.get('length'),
        range   = SC.IndexSet.create(),
        del     = this.get('selectionDelegate'),
        groupIndexes = this.get('_contentGroupIndexes'),
        ret, sel ;

    // fast path
    if (!groupIndexes && (del.collectionViewShouldSelectIndexes === this.collectionViewShouldSelectIndexes)) {
      return proposedIndex;
    }

    // loop forwards looking for an index that is allowed by delegate
    // we could alternatively just pass the whole range but this might be
    // slow for the delegate
    while (proposedIndex < lim) {
      if (!groupIndexes || !groupIndexes.contains(proposedIndex)) {
        range.add(proposedIndex);
        ret = del.collectionViewShouldSelectIndexes(this, range);
        if (ret && ret.get('length') >= 1) return proposedIndex ;
        range.remove(proposedIndex);
      }
      proposedIndex++;
    }

    // if nothing was found, return top of selection
    if (bottom === undefined) {
      sel = this.get('selection');
      bottom = sel ? sel.get('max') : -1 ;
    }
    return bottom ;
  },

  /** @private
   Finds the previous selectable item, up to the first item, by asking the
   delegate. If a non-selectable item is found, the index is skipped. If
   no item is found, selection index is returned unmodified.

   @param {Integer} proposedIndex the desired index to select
   @returns {Integer} the previous selectable index. This will always be in the range of the top of the current selection index and the proposed index.
  */
  _findPreviousSelectableItemFromIndex: function(proposedIndex, top) {
    var range   = SC.IndexSet.create(),
        del     = this.get('selectionDelegate'),
        groupIndexes = this.get('_contentGroupIndexes'),
        ret ;

    if (SC.none(proposedIndex)) proposedIndex = -1;

    // fast path
    if (!groupIndexes && (del.collectionViewShouldSelectIndexes === this.collectionViewShouldSelectIndexes)) {
      return proposedIndex;
    }

    // loop backwards looking for an index that is allowed by delegate
    // we could alternatively just pass the whole range but this might be
    // slow for the delegate
    while (proposedIndex >= 0) {
      if (!groupIndexes || !groupIndexes.contains(proposedIndex)) {
        range.add(proposedIndex);
        ret = del.collectionViewShouldSelectIndexes(this, range);
        if (ret && ret.get('length') >= 1) return proposedIndex ;
        range.remove(proposedIndex);
      }
      proposedIndex--;
    }

    // if nothing was found, return top of selection
    if (top === undefined) {
      var sel = this.get('selection');
      top = sel ? sel.get('min') : -1 ;
    }
    if (SC.none(top)) top = -1;
    return top ;
  },

  /**
    Select one or more items before the current selection, optionally
    extending the current selection.  Also scrolls the selected item into
    view.

    Selection does not wrap around.

    @param {Boolean} [extend] If true, the selection will be extended
      instead of replaced. Defaults to false.
    @param {Integer} [numberOfItems] The number of previous to be
      selected.  Defaults to 1
    @returns {SC.CollectionView} receiver
  */
  selectPreviousItem: function(extend, numberOfItems) {
    if (SC.none(numberOfItems)) numberOfItems = 1;
    if (SC.none(extend)) extend = false;

    var sel     = this.get('selection'),
        content = this.get('content');
    if (sel) sel = sel.indexSetForSource(content);

    var selTop    = sel ? sel.get('min') : -1,
        selBottom     = sel ? sel.get('max')-1 : -1,
        anchor        = this._selectionAnchor;
    if (SC.none(anchor)) anchor = selTop;

    // if extending, then we need to do some fun stuff to build the array
    if (extend) {

      // If the selBottom is after the anchor, then reduce the selection
      if (selBottom > anchor) {
        selBottom = selBottom - numberOfItems ;

      // otherwise, select the previous item from the top
      } else {
        selTop = this._findPreviousSelectableItemFromIndex(selTop - numberOfItems);
      }

      // Ensure we are not out of bounds
      if (SC.none(selTop) || (selTop < 0)) selTop = 0 ;
      if (!content.objectAt(selTop)) selTop = sel ? sel.get('min') : -1;
      if (selBottom < selTop) selBottom = selTop ;

    // if not extending, just select the item previous to the selTop
    } else {
      selTop = this._findPreviousSelectableItemFromIndex(selTop - numberOfItems);
      if (SC.none(selTop) || (selTop < 0)) selTop = 0 ;
      if (!content.objectAt(selTop)) selTop = sel ? sel.get('min') : -1;
      selBottom = selTop ;
      anchor = null ;
    }

    var scrollToIndex = selTop ;

    // now build new selection
    sel = SC.IndexSet.create(selTop, selBottom+1-selTop);

    // ensure that the item is visible and set the selection
    this.scrollToContentIndex(scrollToIndex) ;
    this.select(sel) ;
    this._selectionAnchor = anchor ;
    return this ;
  },

  /**
    Select one or more items following the current selection, optionally
    extending the current selection.  Also scrolls to selected item.

    Selection does not wrap around.

    @param {Boolean} [extend] If true, the selection will be extended
      instead of replaced. Defaults to false.
    @param {Integer} [numberOfItems] The number of items to be
      selected. Defaults to 1.
    @returns {SC.CollectionView} receiver
  */
  selectNextItem: function(extend, numberOfItems) {
    if (SC.none(numberOfItems)) numberOfItems = 1 ;
    if (SC.none(extend)) extend = false ;

    var sel     = this.get('selection'),
        content = this.get('content');
    if (sel) sel = sel.indexSetForSource(content);

    var selTop    = sel ? sel.get('min') : -1,
        selBottom = sel ? sel.get('max')-1 : -1,
        anchor    = this._selectionAnchor,
        lim       = this.get('length');

    if (SC.none(anchor)) anchor = selTop;

    // if extending, then we need to do some fun stuff to build the array
    if (extend) {

      // If the selTop is before the anchor, then reduce the selection
      if (selTop < anchor) {
        selTop = selTop + numberOfItems ;

      // otherwise, select the next item after the bottom
      } else {
        selBottom = this._findNextSelectableItemFromIndex(selBottom + numberOfItems, selBottom);
      }

      // Ensure we are not out of bounds
      if (selBottom >= lim) selBottom = lim-1;

      // we also need to check that the item exists
      if (!content.objectAt(selBottom)) selBottom = sel ? sel.get('max') - 1 : -1;

      // and if top has eclipsed bottom, handle that too.
      if (selTop > selBottom) selTop = selBottom ;

    // if not extending, just select the item next to the selBottom
    } else {
      selBottom = this._findNextSelectableItemFromIndex(selBottom + numberOfItems, selBottom);

      if (selBottom >= lim) selBottom = lim-1;
      if (!content.objectAt(selBottom)) selBottom = sel ? sel.get('max') - 1 : -1;
      selTop = selBottom ;
      anchor = null ;
    }

    var scrollToIndex = selBottom ;

    // now build new selection
    sel = SC.IndexSet.create(selTop, selBottom-selTop+1);

    // ensure that the item is visible and set the selection
    this.scrollToContentIndex(scrollToIndex) ;
    this.select(sel) ;
    this._selectionAnchor = anchor ;
    return this ;
  },

  /**
    Deletes the selected content if canDeleteContent is YES.  This will invoke
    delegate methods to provide fine-grained control.  Returns YES if the
    deletion was possible, even if none actually occurred.

    @returns {Boolean} YES if deletion is possible.
  */
  deleteSelection: function() {
    // perform some basic checks...
    if (!this.get('isEditable') || !this.get('canDeleteContent')) return NO;

    var sel     = this.get('selection'),
        content = this.get('content'),
        del     = this.get('selectionDelegate'),
        indexes = sel&&content ? sel.indexSetForSource(content) : null;

    if (!content || !indexes || indexes.get('length') === 0) return NO ;

    // let the delegate decide what to actually delete.  If this returns an
    // empty index set or null, just do nothing.
    indexes = del.collectionViewShouldDeleteIndexes(this, indexes);
    if (!indexes || indexes.get('length') === 0) return NO ;

    // now have the delegate (or us) perform the deletion. The default
    // delegate implementation just uses standard SC.Array methods to do the
    // right thing.
    del.collectionViewDeleteContent(this, this.get('content'), indexes);

    return YES ;
  },

  // ..........................................................
  // SCROLLING
  //

  /**
    Scroll the rootElement (if needed) to ensure that the item is visible.

    @param {Number} contentIndex The index of the item to scroll to
    @returns {SC.CollectionView} receiver
  */
  scrollToContentIndex: function(contentIndex) {
    var itemView = this.itemViewForContentIndex(contentIndex) ;
    if (itemView) this.scrollToItemView(itemView) ;
    return this;
  },

  /**
    Scroll to the passed item view.  If the item view is not visible on screen
    this method will not work.

    @param {SC.View} view The item view to scroll to
    @returns {SC.CollectionView} receiver
  */
  scrollToItemView: function(view) {
    if (view) view.scrollToVisible();
    return this ;
  },

  // ..........................................................
  // DESIGN MODE SUPPORT
  //

  /** @private Set the designMode on each item view. */
  adjustChildDesignModes: function (lastDesignMode, designMode) {
    sc_super();

    var idx,
      itemView,
      nowShowing = this.get('nowShowing');

    // Only loop through the now showing indexes, if the content is sparsely
    // loaded we could inadvertently trigger reloading unneeded content.
    nowShowing.forEach(function(idx) {
      itemView = this.itemViewForContentIndex(idx);
      itemView.updateDesignMode(lastDesignMode, designMode);
    }, this);
  },

  // ..........................................................
  // KEYBOARD EVENTS
  //

  /** @private */
  keyDown: function(evt) {
    var ret = this.interpretKeyEvents(evt) ;
    return !ret ? NO : ret ;
  },

  /** @private */
  keyUp: function() { return true; },

  /** @private
    Handle space key event.  Do action
  */
  insertText: function(chr, evt) {
    if (chr === ' ') {
      var sel = this.get('selection');
      if (sel && sel.get('length')>0) {
        this.invokeLater(this._cv_action, 0, null, evt);
      }
      return YES ;
    } else return NO ;
  },

  /** @private
    Handle select all keyboard event.
  */
  selectAll: function(evt) {
    var content = this.get('content'),
        del = this.delegateFor('allowsMultipleSelection', this.get('delegate'), content);
    if (del && del.get('allowsMultipleSelection')) {
      var sel = content ? SC.IndexSet.create(0, content.get('length')) : null;
      this.select(sel, NO) ;
    }
    return YES ;
  },

  /** @private
    Remove selection of any selected items.
  */
  deselectAll: function() {
    var content = this.get('content'),
        del = this.delegateFor('allowsEmptySelection', this.get('delegate'), content);
    if (del && del.get('allowsEmptySelection')) {
      var sel = content ? SC.IndexSet.create(0, content.get('length')) : null;
      this.deselect(sel, NO);
    }
    return YES ;
  },

  /** @private
    Handle delete keyboard event.
  */
  deleteBackward: function(evt) {
    return this.deleteSelection() ;
  },

  /** @private
    Handle delete keyboard event.
  */
  deleteForward: function(evt) {
    return this.deleteSelection() ;
  },

  /** @private
    Selects the same item on the next row or moves down one if itemsPerRow = 1
  */
  moveDown: function(sender, evt) {
    this.selectNextItem(false, this.get('itemsPerRow') || 1) ;
    this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    return true ;
  },

  /** @private
    Selects the same item on the next row or moves up one if itemsPerRow = 1
  */
  moveUp: function(sender, evt) {
    this.selectPreviousItem(false, this.get('itemsPerRow') || 1) ;
    this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    return true ;
  },

  /** @private
    Selects the previous item if itemsPerRow > 1.  Otherwise does nothing.
    If item is expandable, will collapse.
  */
  moveLeft: function(evt) {
    // If the control key is down, this may be a browser shortcut and
    // we should not handle the arrow key.
    if (evt.ctrlKey || evt.metaKey) return NO;

    if ((this.get('itemsPerRow') || 1) > 1) {
      this.selectPreviousItem(false, 1);
      this._cv_performSelectAction(null, evt, this.ACTION_DELAY);

    } else {
      var sel     = this.get('selection'),
          content = this.get('content'),
          indexes = sel ? sel.indexSetForSource(content) : null;

      // Collapse the element if it is expanded.  However, if there is exactly
      // one item selected and the item is already collapsed or is a leaf
      // node, then select the (expanded) parent element instead as a
      // convenience to the user.
      if ( indexes ) {
        var del,     // We'll load it lazily
            selectParent = false,
            index;

        if ( indexes.get('length') === 1 ) {
          index = indexes.get('firstObject');
          del = this.get('contentDelegate');
          var state = del.contentIndexDisclosureState(this, content, index);
          if (state !== SC.BRANCH_OPEN) selectParent = true;
        }

        if ( selectParent ) {
          // TODO:  PERFORMANCE:  It would be great to have a function like
          //        SC.CollectionView.selectParentItem() or something similar
          //        for performance reasons.  But since we don't currently
          //        have such a function, let's just iterate through the
          //        previous items until we find the first one with a outline
          //        level of one less than the selected item.
          var desiredOutlineLevel = del.contentIndexOutlineLevel(this, content, index) - 1;
          if ( desiredOutlineLevel >= 0 ) {
            var parentIndex = -1;
            while ( parentIndex < 0 ) {
              var previousItemIndex = this._findPreviousSelectableItemFromIndex(index - 1);
              if (previousItemIndex < 0 ) return false;    // Sanity-check.
              index = previousItemIndex;
              var outlineLevel = del.contentIndexOutlineLevel(this, content, index);
              if ( outlineLevel === desiredOutlineLevel ) {
                parentIndex = previousItemIndex;
              }
            }

            // If we found the parent, select it now.
            if ( parentIndex !== -1 ) {
              this.select(index);
            }
          }
        }
        else {
          this.collapse(indexes);
        }
      }
    }

    return true ;
  },

  /** @private
    Selects the next item if itemsPerRow > 1.  Otherwise does nothing.
  */
  moveRight: function(evt) {
    // If the control key is down, this may be a browser shortcut and
    // we should not handle the arrow key.
    if (evt.ctrlKey || evt.metaKey) return NO;

    if ((this.get('itemsPerRow') || 1) > 1) {
      this.selectNextItem(false, 1) ;
      this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    } else {
      var sel     = this.get('selection'),
          content = this.get('content'),
          indexes = sel ? sel.indexSetForSource(content) : null;
      if (indexes) this.expand(indexes);
    }

    return true ;
  },

  /** @private */
  moveDownAndModifySelection: function(sender, evt) {
    this.selectNextItem(true, this.get('itemsPerRow') || 1) ;
    this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    return true ;
  },

  /** @private */
  moveUpAndModifySelection: function(sender, evt) {
    this.selectPreviousItem(true, this.get('itemsPerRow') || 1) ;
    this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    return true ;
  },

  /** @private
    Selects the previous item if itemsPerRow > 1.  Otherwise does nothing.
  */
  moveLeftAndModifySelection: function(sender, evt) {
    if ((this.get('itemsPerRow') || 1) > 1) {
      this.selectPreviousItem(true, 1) ;
      this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    }
    return true ;
  },

  /** @private
    Selects the next item if itemsPerRow > 1.  Otherwise does nothing.
  */
  moveRightAndModifySelection: function(sender, evt) {
    if ((this.get('itemsPerRow') || 1) > 1) {
      this.selectNextItem(true, 1) ;
      this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    }
    return true ;
  },

  /** @private
    if content value is editable and we have one item selected, then edit.
    otherwise, invoke action.
  */
  insertNewline: function(sender, evt) {
    var canEdit = this.get('isEditable') && this.get('canEditContent'),
        sel, content, set, idx, itemView;

    // first make sure we have a single item selected; get idx
    if (canEdit) {
      sel     = this.get('selection') ;
      content = this.get('content');
      if (sel && sel.get('length') === 1) {
        set = sel.indexSetForSource(content);
        idx = set ? set.get('min') : -1;
        canEdit = idx>=0;
      }
    }

    // next find itemView and ensure it supports editing
    if (canEdit) {
      itemView = this.itemViewForContentIndex(idx);
      canEdit = itemView && SC.typeOf(itemView.beginEditing)===SC.T_FUNCTION;
    }

    // ok, we can edit..
    if (canEdit) {
      this.scrollToContentIndex(idx);
      itemView = this.itemViewForContentIndex(idx); // just in case
      itemView.beginEditing();

    // invoke action
    } else {
      this.invokeLater(this._cv_action, 0, itemView, null) ;
    }

    return YES ; // always handle
  },

  insertTab: function(evt) {
    var view = this.get('nextValidKeyView');
    if (view) view.becomeFirstResponder();
    else evt.allowDefault();
    return YES ; // handled
  },

  insertBacktab: function(evt) {
    var view = this.get('previousValidKeyView');
    if (view) view.becomeFirstResponder();
    else evt.allowDefault();
    return YES ; // handled
  },

  // ..........................................................
  // MOUSE EVENTS
  //

  /** @private
    Handles mouse down events on the collection view or on any of its
    children.

    The default implementation of this method can handle a wide variety
    of user behaviors depending on how you have configured the various
    options for the collection view.

    @param ev {Event} the mouse down event
    @returns {Boolean} Usually YES.
  */
  mouseDown: function(ev) {
    var content = this.get('content');

    // Fast path!
    if (!content) return this.get('isSelectable');

    var itemView      = this.itemViewForEvent(ev),
        contentIndex  = itemView ? itemView.get('contentIndex') : -1,
        info, anchor, sel, isSelected, modifierKeyPressed, didSelect = NO,
        allowsMultipleSel = content.get('allowsMultipleSelection');

    if (!this.get('isEnabledInPane')) return contentIndex > -1;

    if(!this.get('isSelectable')) return NO;

    // become first responder if possible.
    this.becomeFirstResponder() ;

    // Toggle the selection if selectOnMouseDown is true
    if (this.get('useToggleSelection')) {
      if (this.get('selectOnMouseDown')) {
        if (!itemView) return ; // do nothing when clicked outside of elements

        // determine if item is selected. If so, then go on.
        sel = this.get('selection') ;
        isSelected = sel && sel.containsObject(itemView.get('content')) ;

        if (isSelected) {
          this.deselect(contentIndex);
        } else if (!allowsMultipleSel) {
          this.select(contentIndex, NO);
          didSelect = YES;
        } else {
          this.select(contentIndex, YES);
          didSelect = YES;
        }

        if (didSelect && this.get('actOnSelect')) {
          // handle actions on editing
          this._cv_performSelectAction(itemView, ev);
        }
      }

      return YES;
    }

    // received a mouseDown on the collection element, but not on one of the
    // childItems... unless we do not allow empty selections, set it to empty.
    if (!itemView) {
      if (this.get('allowDeselectAll')) this.select(null, false);
      return YES ;
    }

    // collection some basic setup info
    sel = this.get('selection');
    if (sel) sel = sel.indexSetForSource(content);

    info = this.mouseDownInfo = {
      event:        ev,
      itemView:     itemView,
      contentIndex: contentIndex,
      at:           Date.now()
    };

    isSelected = sel ? sel.contains(contentIndex) : NO;
    info.modifierKeyPressed = modifierKeyPressed = ev.ctrlKey || ev.metaKey ;


    // holding down a modifier key while clicking a selected item should
    // deselect that item...deselect and bail.
    if (modifierKeyPressed && isSelected) {
      info.shouldDeselect = contentIndex >= 0;

    // if the shiftKey was pressed, then we want to extend the selection
    // from the last selected item
    } else if (ev.shiftKey && sel && sel.get('length') > 0 && allowsMultipleSel) {
      sel = this._findSelectionExtendedByShift(sel, contentIndex);
      anchor = this._selectionAnchor ;
      this.select(sel) ;
      this._selectionAnchor = anchor; //save the anchor

    // If no modifier key was pressed, then clicking on the selected item
    // should clear the selection and reselect only the clicked on item.
    } else if (!modifierKeyPressed && isSelected) {
      info.shouldReselect = contentIndex >= 0;

    // Otherwise, if selecting on mouse down,  simply select the clicked on
    // item, adding it to the current selection if a modifier key was pressed.
    } else {

      if((ev.shiftKey || modifierKeyPressed) && !allowsMultipleSel){
        this.select(null, false);
      }

      if (this.get("selectOnMouseDown")) {
        this.select(contentIndex, modifierKeyPressed);
      } else {
        info.shouldSelect = contentIndex >= 0 ;
      }
    }

    // saved for extend by shift ops.
    info.previousContentIndex = contentIndex;

    return YES;
  },

  /** @private */
  mouseUp: function(ev) {
    var view = this.itemViewForEvent(ev),
        info = this.mouseDownInfo,
        content = this.get('content');

    // Fast path!
    if (!content) {
      this._cleanupMouseDown();
      return true;
    }

    var contentIndex = view ? view.get('contentIndex') : -1,
        sel, isSelected, canEdit, itemView, idx,
        allowsMultipleSel = content.get('allowsMultipleSelection');

    if (!this.get('isEnabledInPane')) return contentIndex > -1;
    if(!this.get('isSelectable')) return NO;

    if (this.get('useToggleSelection')) {
      // Return if clicked outside of elements or if toggle was handled by mouseDown
      if (!view || this.get('selectOnMouseDown')) return NO;

      // determine if item is selected. If so, then go on.
      sel = this.get('selection') ;
      isSelected = sel && sel.containsObject(view.get('content')) ;

      if (isSelected) {
        this.deselect(contentIndex) ;
      } else if (!allowsMultipleSel) {
        this.select(contentIndex, NO) ;
      } else {
        this.select(contentIndex, YES) ;
      }

    } else if(info) {
      idx = info.contentIndex;
      contentIndex = (view) ? view.get('contentIndex') : -1 ;

      // this will be set if the user simply clicked on an unselected item and
      // selectOnMouseDown was NO.
      if (info.shouldSelect) this.select(idx, info.modifierKeyPressed);

      // This is true if the user clicked on a selected item with a modifier
      // key pressed.
      if (info.shouldDeselect) this.deselect(idx);

      // This is true if the user clicked on a selected item without a
      // modifier-key pressed.  When this happens we try to begin editing
      // on the content.  If that is not allowed, then simply clear the
      // selection and reselect the clicked on item.
      if (info.shouldReselect) {

        // - contentValueIsEditable is true
        canEdit = this.get('isEditable') && this.get('canEditContent') ;

        // - the user clicked on an item that was already selected
        //   ^ this is the only way shouldReset is set to YES

        // - is the only item selected
        if (canEdit) {
          sel = this.get('selection') ;
          canEdit = sel && (sel.get('length') === 1);
        }

        // - the item view responds to contentHitTest() and returns YES.
        // - the item view responds to beginEditing and returns YES.
        if (canEdit) {
          itemView = this.itemViewForContentIndex(idx) ;
          canEdit = itemView && (!itemView.contentHitTest || itemView.contentHitTest(ev)) ;
          canEdit = (canEdit && itemView.beginEditing) ? itemView.beginEditing() : NO ;
        }

        // if cannot edit, schedule a reselect (but give doubleClick a chance)
        if (!canEdit) {
          if (this._cv_reselectTimer) this._cv_reselectTimer.invalidate() ;
          this._cv_reselectTimer = this.invokeLater(this.select, 300, idx, false) ;
        }
      }

      this._cleanupMouseDown() ;
    }

    // handle actions on editing
    this._cv_performSelectAction(view, ev, 0, ev.clickCount);

    return NO;  // bubble event to allow didDoubleClick to be called...
  },

  /** @private */
  _cleanupMouseDown: function() {

    // delete items explicitly to avoid leaks on IE
    var info = this.mouseDownInfo, key;
    if (info) {
      for(key in info) {
        if (!info.hasOwnProperty(key)) continue;
        delete info[key];
      }
    }
    this.mouseDownInfo = null;
  },

  /** @private */
  mouseMoved: function(ev) {
    var view = this.itemViewForEvent(ev),
        last = this._lastHoveredItem ;

    // handle hover events.
    if (view !== last) {
      if (last && last.mouseExited) last.mouseExited(ev);
      if (view && view.mouseEntered) view.mouseEntered(ev);
    }
    this._lastHoveredItem = view ;

    if (view && view.mouseMoved) view.mouseMoved(ev);
    return YES;
  },

  /** @private */
  mouseExited: function(ev) {
    var view = this._lastHoveredItem ;
    this._lastHoveredItem = null ;
    if (view && view.mouseExited) view.mouseExited(ev) ;
    return YES ;
  },

  // ..........................................................
  // TOUCH EVENTS
  //

  /** @private */
  touchStart: function(touch, evt) {
    var itemView = this.itemViewForEvent(touch),
        contentIndex = itemView ? itemView.get('contentIndex') : -1;

    if (!this.get('isEnabledInPane')) return contentIndex > -1;

    // become first responder if possible.
    this.becomeFirstResponder() ;

    this._touchSelectedView = itemView;

    if (!this.get('useToggleSelection')) {
      // We're faking the selection visually here
      // Only track this if we added a selection so we can remove it later
      if (itemView && !itemView.get('isSelected')) {
        itemView.set('isSelected', YES);
      }
    }

    return YES;
  },

  /** @private */
  touchesDragged: function(evt, touches) {
    touches.forEach(function(touch){
      if (
        Math.abs(touch.pageX - touch.startX) > 5 ||
        Math.abs(touch.pageY - touch.startY) > 5
      ) {
        // This calls touchCancelled
        touch.makeTouchResponder(touch.nextTouchResponder);
      }
    }, this);

  },

  /** @private */
  touchEnd: function(touch) {
    /*
      TODO [CC] We should be using itemViewForEvent here, but because
            ListItemView re-renders itself once isSelected is called
            in touchStart, the elements attached to this event are
            getting orphaned and this event is basically a complete
            fail when using touch events.
    */
    // var itemView = this.itemViewForEvent(touch),
    var itemView = this._touchSelectedView,
        contentIndex = itemView ? itemView.get('contentIndex') : -1,
        isSelected = NO, sel, shouldSelect;

    if (!this.get('isEnabledInPane')) return contentIndex > -1;

    if (contentIndex > -1) {
      if (this.get('useToggleSelection')) {
        sel = this.get('selection');
        isSelected = sel && sel.containsObject(itemView.get('content'));
        shouldSelect = !isSelected;
      }
      else
        shouldSelect = true;

      if (shouldSelect) {
        this.select(contentIndex, NO);

        // If actOnSelect is implemented, the action will be fired.
        this._cv_performSelectAction(itemView, touch, 0);
      } else {
        this.deselect(contentIndex);
      }
    }

    this._touchSelectedView = null;
  },

  /** @private */
  touchCancelled: function(evt) {
    // Remove fake selection
    if (this._touchSelectedView) {
      this._touchSelectedView.set('isSelected', NO);
      this._touchSelectedView = null;
    }
  },

  /** @private */
  _findSelectionExtendedByShift: function(sel, contentIndex) {

    // fast path.  if we don't have a selection, just select index
    if (!sel || sel.get('length')===0) {
      return SC.IndexSet.create(contentIndex);
    }

    // if we do have a selection, then figure out how to extend it.
    var min     = sel.get('min'),
        max     = sel.get('max')-1,
        anchor  = this._selectionAnchor ;
    if (SC.none(anchor)) anchor = -1;

    // clicked before the current selection set... extend it's beginning...
    if (contentIndex < min) {
      min = contentIndex;
      if (anchor<0) this._selectionAnchor = anchor = max; //anchor at end

    // clicked after the current selection set... extend it's ending...
    } else if (contentIndex > max) {
      max = contentIndex;
      if (anchor<0) this._selectionAnchor = anchor = min; // anchor at start

    // clicked inside the selection set... need to determine where the last
    // selection was and use that as an anchor.
    } else if (contentIndex >= min && contentIndex <= max) {
      if (anchor<0) this._selectionAnchor = anchor = min; //anchor at start

      if (contentIndex === anchor) min = max = contentIndex ;
      else if (contentIndex > anchor) {
        min = anchor;
        max = contentIndex ;
      } else if (contentIndex < anchor) {
        min = contentIndex;
        max = anchor ;
      }
    }

    return SC.IndexSet.create(min, max - min + 1);
  },

  // ......................................
  // DRAG AND DROP SUPPORT
  //

  /**
    When reordering its content, the collection view will store its reorder
    data using this special data type.  The data type is unique to each
    collection view instance.  You can use this data type to detect reorders
    if necessary.

    @field
    @type String
  */
  reorderDataType: function() {
    return 'SC.CollectionView.Reorder.'+SC.guidFor(this) ;
  }.property().cacheable(),

  /**
    This property is set to the IndexSet of content objects that are the
    subject of a drag whenever a drag is initiated on the collection view.
    You can consult this property when implementing your collection view
    delegate  methods, but otherwise you should not use this property in your
    code.

    @type SC.IndexSet
    @default null
  */
  dragContent: null,

  /**
    This property is set to the proposed insertion index during a call to
    collectionViewValidateDragOperation().  Your delegate implementations can
    change the value of this property to enforce a drop some in some other
    location.

    @type Number
    @default null
  */
  proposedInsertionIndex: null,

  /**
    This property is set to the proposed drop operation during a call to
    collectionViewValidateDragOperation().  Your delegate implementations can
    change the value of this property to enforce a different type of drop
    operation.

    @type Number
    @default null
  */
  proposedDropOperation: null,

  /** @private
    mouseDragged event handler.  Initiates a drag if the following conditions
    are met:

    - collectionViewShouldBeginDrag() returns YES *OR*
    - the above method is not implemented and canReorderContent is true.
    - the dragDataTypes property returns a non-empty array
    - a mouse down event was saved by the mouseDown method.
  */
  mouseDragged: function (evt) {
    var del     = this.get('selectionDelegate'),
        content = this.get('content'),
        sel     = this.get('selection'),
        info    = this.mouseDownInfo,
        groupIndexes = this.get('_contentGroupIndexes'),
        dragContent, dragDataTypes, dragView;

    // if the mouse down event was cleared, there is nothing to do; return.
    if (!info || info.contentIndex<0) return YES ;

    // Don't do anything unless the user has been dragging for 123msec
    if ((Date.now() - info.at) < 123) return YES ;

    // OK, they must be serious, decide if a drag will be allowed.
    if (this.get('isEditable') && del.collectionViewShouldBeginDrag(this)) {

      // First, get the selection to drag.  Drag an array of selected
      // items appearing in this collection, in the order of the
      // collection.
      //
      // Compute the dragContent - the indexes we will be dragging.
      // if we don't select on mouse down, then the selection has not been
      // updated to whatever the user clicked.  Instead use
      // mouse down content.
      if (!this.get("selectOnMouseDown")) {
        dragContent = SC.IndexSet.create(info.contentIndex);
      } else dragContent = sel ? sel.indexSetForSource(content) : null;

      // remove any group indexes.  groups cannot be dragged.
      if (dragContent && groupIndexes && groupIndexes.get('length')>0) {
        dragContent = dragContent.copy().remove(groupIndexes);
        if (dragContent.get('length')===0) dragContent = null;
        else dragContent.freeze();
      }

      if (!dragContent) return YES; // nothing to drag
      else dragContent = dragContent.frozenCopy(); // so it doesn't change

      dragContent = { content: content, indexes: dragContent };
      this.set('dragContent', dragContent) ;

      // Get the set of data types supported by the delegate.  If this returns
      // a null or empty array and reordering content is not also supported
      // then do not start the drag.
      dragDataTypes = this.get('dragDataTypes');
      if (dragDataTypes && dragDataTypes.get('length') > 0) {

        // Build the drag view to use for the ghost drag.  This
        // should essentially contain any visible drag items.
        dragView = del.collectionViewDragViewFor(this, dragContent.indexes);
        if (!dragView) dragView = this._cv_dragViewFor(dragContent.indexes);

        // Initiate the drag
        SC.Drag.start({
          event: info.event,
          source: this,
          dragView: dragView,
          ghost: NO,
          ghostActsLikeCursor: del.ghostActsLikeCursor,
          slideBack: YES,
          dataSource: this
        });

        // Also use this opportunity to clean up since mouseUp won't
        // get called.
        this._cleanupMouseDown() ;
        this._lastInsertionIndex = null ;

      // Drag was not allowed by the delegate, so bail.
      } else this.set('dragContent', null) ;

      return YES ;
    }
  },

  /** @private
    Compute a default drag view by grabbing the raw layers and inserting them
    into a drag view.
  */
  _cv_dragViewFor: function(dragContent) {
    // find only the indexes that are in both dragContent and nowShowing.
    var indexes = this.get('nowShowing').without(dragContent),
        dragLayer = this.get('layer').cloneNode(false),
        view = SC.View.create({ layer: dragLayer, parentView: this }),
        height=0, layout;

    indexes = this.get('nowShowing').without(indexes);

    // cleanup weird stuff that might make the drag look out of place
    SC.$(dragLayer).css('backgroundColor', 'transparent')
      .css('border', 'none')
      .css('top', 0).css('left', 0);

    indexes.forEach(function(i) {
      var itemView = this.itemViewForContentIndex(i),
          isSelected, itemViewLayer, layer;

      if (itemView) {
        // render item view without isSelected state.
        isSelected = itemView.get('isSelected');
        itemView.set('isSelected', NO);
        itemView.updateLayerIfNeeded();
        itemViewLayer = itemView.get('layer');

        if (itemViewLayer) {
          layer = itemViewLayer.cloneNode(true);

          // photocopy any canvas elements
          var itemViewCanvasses = itemView.$().find('canvas');
          if (itemViewCanvasses) {
            var layerCanvasses = $(layer).find('canvas'),
                len = itemViewCanvasses.length,
                itemViewCanvas, layerCanvas, i;
            for (i = 0; i < len; i++) {
              itemViewCanvas = itemViewCanvasses[i];
              layerCanvas = layerCanvasses[i];
              layerCanvas.height = itemViewCanvas.height;
              layerCanvas.width = itemViewCanvas.width;
              layerCanvas.getContext('2d').drawImage(itemViewCanvas, 0, 0);
            }
          }
        }

        // reset item view
        itemView.set('isSelected', isSelected);
        itemView.updateLayerIfNeeded();
      }

      if (layer) {
        dragLayer.appendChild(layer);
        layout = itemView.get('layout');
        if(layout.height+layout.top>height){
          height = layout.height+layout.top;
        }
      }

      layer = null;
    }, this);

    // we don't want to show the scrollbars, resize the dragview
    view.set('layout', { height: height });

    dragLayer = null;
    return view ;
  },


  /**
    Implements the drag data source protocol for the collection view.  This
    property will consult the collection view delegate if one is provided. It
    will also do the right thing if you have set canReorderContent to YES.

    @field
    @type Array
  */
  dragDataTypes: function() {
    // consult delegate.
    var del = this.get('selectionDelegate'),
        ret = del.collectionViewDragDataTypes(this),
        key ;

    if (this.get('canReorderContent')) {
      ret = ret ? ret.copy() : [];
      key = this.get('reorderDataType');
      if (ret.indexOf(key) < 0) ret.push(key);
    }

    return ret ? ret : [];
  }.property(),

  /**
    Implements the drag data source protocol method. The implementation of
    this method will consult the collection view delegate if one has been
    provided.  It also respects the canReorderContent method.
  */
  dragDataForType: function(drag, dataType) {

    // if this is a reorder, then return drag content.
    if (this.get('canReorderContent')) {
      if (dataType === this.get('reorderDataType')) {
        return this.get('dragContent') ;
      }
    }

    // otherwise, just pass along to the delegate
    var del = this.get('selectionDelegate');
    return del.collectionViewDragDataForType(this, drag, dataType);
  },

  /**
    Implements the SC.DropTarget interface.  The default implementation will
    consult the collection view delegate, if you implement those methods.

    This method is called once when the drag enters the view area.  It's
    return value will be stored on the drag object as allowedDragOperations,
    possibly further constrained by the drag source.

    @param {SC.Drag} drag the drag object
    @param {SC.Event} evt the event triggering this change, if available
    @returns {Number} logical OR'd mask of allowed drag operations.
  */
  computeDragOperations: function(drag, evt) {
    // the proposed drag operation is DRAG_REORDER only if we can reorder
    // content and the drag contains reorder content.
    var op  = SC.DRAG_NONE,
        del = this.get('selectionDelegate');

    if (this.get('canReorderContent')) {
      if (drag.get('dataTypes').indexOf(this.get('reorderDataType')) >= 0) {
        op = SC.DRAG_REORDER ;
      }
    }

    // Now pass this onto the delegate.
    op = del.collectionViewComputeDragOperations(this, drag, op);
    if (op & SC.DRAG_REORDER) op = SC.DRAG_MOVE ;

    return op ;
  },

  /** @private
    Determines the allowed drop operation insertion point, operation type,
    and the drag operation to be performed.  Used by dragUpdated() and
    performDragOperation().

    @param {SC.Drag} drag the drag object
    @param {SC.Event} evt source of this request, if available
    @param {Number} dragOp allowed drag operation mask
    Returns three params: [drop index, drop operation, allowed drag ops]
  */
  _computeDropOperationState: function(drag, evt, dragOp) {
    // get the insertion index for this location.  This can be computed
    // by a subclass using whatever method.  This method is not expected to
    // do any data validation, just to map the location to an insertion
    // index.
    var loc    = this.convertFrameFromView(drag.get('location'), null),
        dropOp = SC.DROP_BEFORE,
        del    = this.get('selectionDelegate'),
        canReorder = this.get('canReorderContent'),
        objects, content, isPreviousInDrag, isNextInDrag, len, tmp;

    // STEP 1: Try with a DROP_ON option -- send straight to delegate if
    // supported by view.

    // get the computed insertion index and possibly drop operation.
    // prefer to drop ON.
    var idx = this.insertionIndexForLocation(loc, SC.DROP_ON) ;
    if (SC.typeOf(idx) === SC.T_ARRAY) {
      dropOp = idx[1] ; // order matters here
      idx = idx[0] ;
    }

    // if the return drop operation is DROP_ON, then just check it with the
    // delegate method.  If the delegate method does not support dropping on,
    // then it will return DRAG_NONE, in which case we will try again with
    // drop before.
    if (dropOp === SC.DROP_ON) {

      // Now save the insertion index and the dropOp.  This may be changed by
      // the collection delegate.
      this.set('proposedInsertionIndex', idx) ;
      this.set('proposedDropOperation', dropOp) ;
      tmp = del.collectionViewValidateDragOperation(this, drag, dragOp, idx, dropOp) ;
      idx = this.get('proposedInsertionIndex') ;
      dropOp = this.get('proposedDropOperation') ;
      this._dropInsertionIndex = this._dropOperation = null ;

      // The delegate is OK with a drop on also, so just return.
      if (tmp !== SC.DRAG_NONE) return [idx, dropOp, tmp] ;

      // The delegate is NOT OK with a drop on, try to get the insertion
      // index again, but this time prefer SC.DROP_BEFORE, then let the
      // rest of the method run...
      else {
        dropOp = SC.DROP_BEFORE ;
        idx = this.insertionIndexForLocation(loc, SC.DROP_BEFORE) ;
        if (SC.typeOf(idx) === SC.T_ARRAY) {
          dropOp = idx[1] ; // order matters here
          idx = idx[0] ;
        }
      }
    }

    // if this is a reorder drag, set the proposed op to SC.DRAG_REORDER and
    // validate the insertion point.  This only works if the insertion point
    // is DROP_BEFORE or DROP_AFTER.  DROP_ON is not handled by reordering
    // content.
    if ((idx >= 0) && canReorder && (dropOp !== SC.DROP_ON)) {

      objects = drag.dataForType(this.get('reorderDataType')) ;
      if (objects) {
        content = this.get('content') ;

        // if the insertion index is in between two items in the drag itself,
        // then this is not allowed.  Either use the last insertion index or
        // find the first index that is not in between selections.  Stop when
        // we get to the beginning.
        if (dropOp === SC.DROP_BEFORE) {
          isPreviousInDrag = objects.indexes.contains(idx-1);
          isNextInDrag     = objects.indexes.contains(idx);
        } else {
          isPreviousInDrag = objects.indexes.contains(idx);
          isNextInDrag     = objects.indexes.contains(idx-1);
        }

        if (isPreviousInDrag && isNextInDrag) {
          if (SC.none(this._lastInsertionIndex)) {
            if (dropOp === SC.DROP_BEFORE) {
              while ((idx >= 0) && objects.indexes.contains(idx)) idx--;
            } else {
              len = content ? content.get('length') : 0;
              while ((idx < len) && objects.indexes.contains(idx)) idx++;
            }
          } else idx = this._lastInsertionIndex ;
        }

        // If we found a valid insertion point to reorder at, then set the op
        // to custom DRAG_REORDER.
        if (idx >= 0) dragOp = SC.DRAG_REORDER ;
      }
    }

    // Now save the insertion index and the dropOp.  This may be changed by
    // the collection delegate.
    this.set('proposedInsertionIndex', idx) ;
    this.set('proposedDropOperation', dropOp) ;
    dragOp = del.collectionViewValidateDragOperation(this, drag, dragOp, idx, dropOp) ;
    idx = this.get('proposedInsertionIndex') ;
    dropOp = this.get('proposedDropOperation') ;
    this._dropInsertionIndex = this._dropOperation = null ;

    // return generated state
    return [idx, dropOp, dragOp] ;
  },

  /**
    Implements the SC.DropTarget interface.  The default implementation will
    determine the drop location and then consult the collection view delegate
    if you implement those methods.  Otherwise it will handle reordering
    content on its own.

    @param {SC.Drag} drag The drag that was updated
    @param {SC.Event} evt The event for the drag
  */
  dragUpdated: function(drag, evt) {
    var op     = drag.get('allowedDragOperations'),
        state  = this._computeDropOperationState(drag, evt, op),
        idx    = state[0], dropOp = state[1], dragOp = state[2];

    // if the insertion index or dropOp have changed, update the insertion
    // point
    if (dragOp !== SC.DRAG_NONE) {
      if ((this._lastInsertionIndex !== idx) || (this._lastDropOperation !== dropOp)) {
        var itemView = this.itemViewForContentIndex(idx) ;
        this.showInsertionPoint(itemView, dropOp) ;
      }

      this._lastInsertionIndex = idx ;
      this._lastDropOperation = dropOp ;
    } else {
      this.hideInsertionPoint() ;
      this._lastInsertionIndex = this._lastDropOperation = null ;
    }

    // Normalize drag operation to the standard kinds accepted by the drag
    // system.
    return (dragOp & SC.DRAG_REORDER) ? SC.DRAG_MOVE : dragOp;
  },

  /**
    Implements the SC.DropTarget protocol.  Hides any visible insertion
    point and clears some cached values.
  */
  dragEnded: function () {
    this.hideInsertionPoint() ;
    this._lastInsertionIndex = this._lastDropOperation = null ;
  },

  /**
    Implements the SC.DropTarget protocol.

    @returns {Boolean} YES
  */
  acceptDragOperation: function(drag, op) {
    return YES;
  },

  /**
    Implements the SC.DropTarget protocol. Consults the collection view
    delegate to actually perform the operation unless the operation is
    reordering content.

    @param {SC.Drag} drag The drag to perform the operation on
    @param {Number} op The drag operation to perform
    @return {Number} The operation performed
  */
  performDragOperation: function(drag, op) {
    // Get the correct insertion point, drop operation, etc.
    var state = this._computeDropOperationState(drag, null, op),
        idx   = state[0], dropOp = state[1], dragOp = state[2],
        del   = this.get('selectionDelegate'),
        performed, objects, data, content, shift, indexes;

    // The dragOp is the kinds of ops allowed.  The drag operation must
    // be included in that set.
    if (dragOp & SC.DRAG_REORDER) {
      op = (op & SC.DRAG_MOVE) ? SC.DRAG_REORDER : SC.DRAG_NONE ;
    } else op = op & dragOp ;

    // If no allowed drag operation could be found, just return.
    if (op === SC.DRAG_NONE) return op;

    // Some operation is allowed through, give the delegate a chance to
    // handle it.
    performed = del.collectionViewPerformDragOperation(this, drag, op, idx, dropOp) ;

    // If the delegate did not handle the drag (i.e. returned SC.DRAG_NONE),
    // and the op type is REORDER, then do the reorder here.
    if ((performed === SC.DRAG_NONE) && (op & SC.DRAG_REORDER)) {

      data = drag.dataForType(this.get('reorderDataType')) ;
      if (!data) return SC.DRAG_NONE ;

      content = this.get('content') ;

      // check for special case - inserting BEFORE ourself...
      // in this case just pretend the move happened since it's a no-op
      // anyway
      indexes = data.indexes;
      if (indexes.get('length')===1) {
        if (((dropOp === SC.DROP_BEFORE) || (dropOp === SC.DROP_AFTER)) &&
            (indexes.get('min')===idx)) return SC.DRAG_MOVE;
      }

      content.beginPropertyChanges(); // suspend notifications

      // get each object, then remove it from the content. they will be
      // added again later.
      objects = [];
      shift = 0;
      data.indexes.forEach(function(i) {
        objects.push(content.objectAt(i-shift));
        content.removeAt(i-shift);
        shift++;
        if (i < idx) idx--;
      }, this);

      // now insert objects into new insertion location
      if (dropOp === SC.DROP_AFTER) idx++;
      content.replace(idx, 0, objects, dropOp);
      this.select(SC.IndexSet.create(idx, objects.length));
      content.endPropertyChanges(); // restart notifications

      // make the op into its actual value
      op = SC.DRAG_MOVE ;
    }

    return op;
  },

  /**
    Default delegate method implementation, returns YES if canReorderContent
    is also true.

    @param {SC.View} view
  */
  collectionViewShouldBeginDrag: function(view) {
    return this.get('canReorderContent');
  },


  // ..........................................................
  // INSERTION POINT
  //


  /**
    Get the preferred insertion point for the given location, including
    an insertion preference of before, after or on the named index.

    You can implement this method in a subclass if you like to perform a
    more efficient check.  The default implementation will loop through the
    item views looking for the first view to "switch sides" in the orientation
    you specify.

    This method should return an array with two values.  The first value is
    the insertion point index and the second value is the drop operation,
    which should be one of SC.DROP_BEFORE, SC.DROP_AFTER, or SC.DROP_ON.

    The preferred drop operation passed in should be used as a hint as to
    the type of operation the view would prefer to receive. If the
    dropOperation is SC.DROP_ON, then you should return a DROP_ON mode if
    possible.  Otherwise, you should never return DROP_ON.

    For compatibility, you can also return just the insertion index.  If you
    do this, then the collection view will assume the drop operation is
    SC.DROP_BEFORE.

    If an insertion is NOT allowed, you should return -1 as the insertion
    point.  In this case, the drop operation will be ignored.

    @param {Point} loc the mouse location.
    @param {DropOp} dropOperation the preferred drop operation.
    @returns {Array} format: [index, op]
  */
  insertionIndexForLocation: function(loc, dropOperation) {
    return -1;
  },

  // ..........................................................
  // SCROLLING
  //

  /** @private SC.ScrollView */
  touchScrollDidStart: function () {
    var clippingFrame = this.get('clippingFrame');

    // Create the in-scroll clipping frame that will be used while touch scrolling.
    this._inScrollClippingFrame = {
      x: clippingFrame.x,
      y: clippingFrame.y,
      width: clippingFrame.width,
      height: clippingFrame.height
    };
  },

  /* @private Internal property used to track the rate of touch scroll change events. */
  _lastTouchScrollTime: null,

  /** @private SC.ScrollView */
  touchScrollDidChange: function (left, top) {
    // Fast path!  Don't try to update too soon.
    if (Date.now() - this._lastTouchScrollTime < 30) { return; }

    var inScrollClippingFrame = this._inScrollClippingFrame;

    // Update the in-scroll clipping frame with the new values.
    inScrollClippingFrame.x = left;
    inScrollClippingFrame.y = top;

    // Indicate that nowShowing should be re-computed (this will use the
    // in-scroll clipping frame when it does).
    // TODO: perform a raw update that doesn't require the run loop.
    SC.run(function () {
      this.notifyPropertyChange('nowShowing');
      this.invokeOnce('_cv_nowShowingDidChange');
    }, this);

    // Track the last time we updated.
    this._lastTouchScrollTime = Date.now();
  },

  /** @private SC.ScrollView */
  touchScrollDidEnd: function () {
    // Clean up so that the regular clippingFrame is used again.
    this._inScrollClippingFrame = null;
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private - when we are about to become visible, reload if needed. */
  willShowInDocument: function () {
      if (this._invalidIndexes) this.invokeOnce(this.reloadIfNeeded);
      if (this._invalidSelection) {
        this.invokeOnce(this.reloadSelectionIndexesIfNeeded);
      }
  },

  /** @private - when we are added, reload if needed. */
  didAppendToDocument: function () {
    if (this._invalidIndexes) this.invokeOnce(this.reloadIfNeeded);
    if (this._invalidSelection) {
      this.invokeOnce(this.reloadSelectionIndexesIfNeeded);
    }
  },

  /**
    Default delegate method implementation, returns YES if isSelectable
    is also true.
  */
  collectionViewShouldSelectItem: function(view, item) {
    return this.get('isSelectable') ;
  },

  /** @private */
  _TMP_DIFF1: SC.IndexSet.create(),

  /** @private */
  _TMP_DIFF2: SC.IndexSet.create(),

  /** @private

    Whenever the nowShowing range changes, update the range observer on the
    content item and instruct the view to reload any indexes that are not in
    the previous nowShowing range.

  */
  _cv_nowShowingDidChange: function() {
    var nowShowing  = this.get('nowShowing'),
        last        = this._sccv_lastNowShowing,
        diff, diff1, diff2;

    // find the differences between the two
    // NOTE: reuse a TMP IndexSet object to avoid creating lots of objects
    // during scrolling
    if (last !== nowShowing) {
      if (last && nowShowing) {
        diff1 = this._TMP_DIFF1.add(last).remove(nowShowing);
        diff2 = this._TMP_DIFF2.add(nowShowing).remove(last);
        diff = diff1.add(diff2);
      } else diff = last || nowShowing ;
    }

    // if nowShowing has actually changed, then update
    if (diff && diff.get('length') > 0) {
      this._sccv_lastNowShowing = nowShowing ? nowShowing.frozenCopy() : null;
      this.updateContentRangeObserver();
      this.reload(diff);
    }

    // cleanup tmp objects
    if (diff1) diff1.clear();
    if (diff2) diff2.clear();

  }.observes('nowShowing'),

  /** @private */
  init: function() {
     sc_super();

    if (this.useFastPath) {
      //@if(debug)
      // Deprecation warning for those that were using SC.CollectionFastPath.
      SC.warn("Developer Warning: SC.CollectionView `useFastPath` has been deprecated.  The performance improvements have been integrated directly into SC.CollectionView as the default behavior.  Please disable the useFastPath property and refer to the SC.CollectionView documentation for more information.");
      //@endif
      this.mixin(SC.CollectionFastPath);
    }

    //@if(debug)
    if (this.willReload || this.didReload) {
      // Deprecation warning for willReload and didReload.  These don't seem to serve any purpose.
      SC.warn("Developer Warning: SC.CollectionView no longer calls willReload and didReload on its subclasses because it includes item view and layer pooling in itself by default.");
    }
    //@endif

     if (this.get('canReorderContent')) this._cv_canReorderContentDidChange();
     this._sccv_lastNowShowing = this.get('nowShowing').clone();

     if (this.content) this._cv_contentDidChange();
     if (this.selection) this._cv_selectionDidChange();
  },

  /** @private
    Become a drop target whenever reordering content is enabled.
  */
  _cv_canReorderContentDidChange: function() {
    if (this.get('canReorderContent')) {
      if (!this.get('isDropTarget')) this.set('isDropTarget', YES);
      SC.Drag.addDropTarget(this);
    }
  }.observes('canReorderContent'),

  /** @private
    Fires an action after a selection if enabled.

    if actOnSelect is YES, then try to invoke the action, passing the
    current selection (saved as a separate array so that a change in sel
    in the meantime will not be lost)
  */
  _cv_performSelectAction: function(view, ev, delay, clickCount) {
    var sel;
    if (delay === undefined) delay = 0 ;
    if (clickCount === undefined) clickCount = 1;
    if ((clickCount>1) || this.get('actOnSelect')) {
      if (this._cv_reselectTimer) this._cv_reselectTimer.invalidate() ;
      sel = this.get('selection');
      sel = sel ? sel.toArray() : [];
      if (this._cv_actionTimer) this._cv_actionTimer.invalidate();
      this._cv_actionTimer = this.invokeLater(this._cv_action, delay, view, ev, sel) ;
    }
  },

  /** @private
    Perform the action.  Supports legacy behavior as well as newer style
    action dispatch.
  */
  _cv_action: function(view, evt, context) {
    var action = this.get('action');
    var target = this.get('target') || null;

    this._cv_actionTimer = null;
    if (action) {
      // if the action is a function, just call it
      if (SC.typeOf(action) === SC.T_FUNCTION) return this.action(view, evt) ;

      // otherwise, use the new sendAction style
      var pane = this.get('pane') ;
      if (pane) {
        pane.rootResponder.sendAction(action, target, this, pane, context);
      }

    // if no action is specified, then trigger the support action,
    // if supported.
    } else if (!view) {
      return ; // nothing to do

    // if the target view has its own internal action handler,
    // trigger that.
    } else if (SC.typeOf(view._action) == SC.T_FUNCTION) {
      return view._action(evt) ;

    // otherwise call the action method to support older styles.
    } else if (SC.typeOf(view.action) == SC.T_FUNCTION) {
      return view.action(evt) ;
    }
  },

  /** @private */
  _attrsForContentIndex: function (idx) {
    var attrs = this._TMP_ATTRS,
      del = this.get('contentDelegate'),
      items = this.get('content'),
      isGroupView = this._contentIndexIsGroup(idx),
      isEditable = this.get('isEditable') && this.get('canEditContent'),
      isReorderable = this.get('isEditable') && this.get('canReorderContent'),
      isDeletable = this.get('isEditable') && this.get('canDeleteContent'),
      isEnabled = del.contentIndexIsEnabled(this, items, idx),
      isSelected = del.contentIndexIsSelected(this, items, idx),
      outlineLevel = del.contentIndexOutlineLevel(this, items, idx),
      disclosureState = del.contentIndexDisclosureState(this, items, idx);

    attrs.contentIndex = idx;
    attrs.content = items.objectAt(idx);
    attrs.designMode = this.get('designMode');
    attrs.disclosureState = disclosureState;
    attrs.isEnabled = isEnabled;
    attrs.isEditable = isEditable;
    attrs.isReorderable = isReorderable;
    attrs.isDeletable = isDeletable;
    attrs.isSelected = isSelected;
    attrs.isGroupView = isGroupView;
    attrs.layerId = this.layerIdFor(idx);
    attrs.owner = attrs.displayDelegate = this;
    attrs.page = this.page;
    attrs.outlineLevel = outlineLevel;
    attrs.isLast = idx === items.get('length') - 1;

    if (isGroupView) attrs.classNames = this._GROUP_COLLECTION_CLASS_NAMES;
    else attrs.classNames = this._COLLECTION_CLASS_NAMES;

    attrs.layout = this.layoutForContentIndex(idx);
    if (!attrs.layout) { attrs.layout = SC.View.prototype.layout; }

    return attrs;
  },

  /** @private
    A cache of the `contentGroupIndexes` value returned by the delegate.  This
    is frequently accessed and usually involves creating an `SC.IndexSet`
    object, so it's worthwhile to cache.
  */
  _contentGroupIndexes: function () {
    return this.get('contentDelegate').contentGroupIndexes(this, this.get('content'));
  }.property('contentDelegate').cacheable(),

  /** @private
    Rather than calling contentIndexIsGroup on the delegate each time, first
    check if there are even any contentGroupIndexes.
  */
  _contentIndexIsGroup: function (idx) {
    var groupIndexes = this.get('_contentGroupIndexes');

    // If there are groupIndexes and the given index is within them, check
    // with the delegate.
    if (groupIndexes && groupIndexes.contains(idx)) {
      var del = this.get('contentDelegate'),
        items = this.get('content');

      return del.contentIndexIsGroup(this, items, idx);
    } else {
      return false;
  }
  },

  /** @private
    Determines the example view for a content index.
  */
  _exampleViewForContentIndex: function (idx) {
    var key,
      ExampleView,
      items = this.get('content'),
      item = items.objectAt(idx);

    if (this._contentIndexIsGroup(idx)) {
      // so, if it is indeed a group view, we go that route to get the example view
      key = this.get('contentGroupExampleViewKey');
      if (key && item) ExampleView = item.get(key);
      if (!ExampleView) ExampleView = this.get('groupExampleView') || this.get('exampleView');
    } else {
      // otherwise, we go through the normal example view
      key = this.get('contentExampleViewKey');
      if (key && item) ExampleView = item.get(key);
      if (!ExampleView) ExampleView = this.get('exampleView');
    }

    return ExampleView;
  },

  /** @private
    Returns the pool for a given example view.

    The pool is calculated based on the guid for the example view class.

    @param {SC.View} exampleView
  */
  _poolForExampleView: function (exampleView) {
    var poolKey = SC.guidFor(exampleView);
    if (!this._pools) { this._pools = {}; }
    if (!this._pools[poolKey]) this._pools[poolKey] = [];
    return this._pools[poolKey];
  },

  /** @private
    Override to compute the hidden layout of the itemView for the content at the
    specified idnex.  This layout will be applied when it is moved to the
    pool for reuse and should be completely outside the visible portion
    of the collection.

    By default this layout is determined using the normal layout for the item.
    If the regular layout has a height, the pooled layout will be one height
    off the top (for top positioned) or off the bottom (for bottom positioned)
    and if the regular layout has a width, the pooled layout will be one
    width off the left (for left positioned) or off the right (for right
    positioned).

    @param Number contentIndex the index of the item in the content
    @returns Object a view layout
  */
  _poolLayoutForContentIndex: function (contentIndex) {
    var layout = this.layoutForContentIndex(contentIndex);

    if (layout && layout.height) {
      if (layout.top) { layout.top = -layout.height; }
      else { layout.bottom = -layout.height; }
    } else if (layout && layout.width) {
      if (layout.left) { layout.left = -layout.width; }
      else { layout.right = -layout.width; }
    } else {
      // There is not really a valid layout for a collection.  Just shape it and
      // place it out of view.
      layout = { left: -100, width: 100, top: -100, height: 100 };
    }

    return layout;
  },

  /** @private
    Configures an existing item view with new attributes.

    @param {SC.View} itemView
    @param {Hash} attrs
  */
  _reconfigureItemView: function (itemView, attrs) {
    itemView.beginPropertyChanges();
    // Update the view with the new properties.
    itemView.set('content', attrs.content);
    itemView.set('contentIndex', attrs.contentIndex);
    itemView.set('designMode', attrs.designMode);
    itemView.set('isEnabled', attrs.isEnabled);
    itemView.set('isEditable', attrs.isEditable);
    itemView.set('isReorderable', attrs.isReorderable);
    itemView.set('isDeletable', attrs.isDeletable);
    itemView.set('isSelected', attrs.isSelected);
    itemView.set('layerId', attrs.layerId);
    itemView.set('layout', attrs.layout);
    itemView.set('outlineLevel', attrs.outlineLevel);
    itemView.set('disclosureState', attrs.disclosureState);
    itemView.set('isLast', attrs.isLast);
    // If the view's isGroupView property is changing, the associated CSS classes need to
    // be updated.
    var isCurrentlyGroupView = itemView.get('isGroupView'),
        shouldBeGroupView = attrs.isGroupView;
    if (isCurrentlyGroupView !== shouldBeGroupView) {
      itemView.set('isGroupView', shouldBeGroupView);
      var classNames = itemView.get('classNames'),
          elem = itemView.$();
      // Going from group view to item view...
      if (isCurrentlyGroupView && !shouldBeGroupView) {
        classNames.pushObject('sc-item');
        classNames.removeObject('sc-group-item');
        elem.setClass({ 'sc-item': YES, 'sc-group-item': NO });
      }
      // Going from item view to group view...
      else {
        classNames.removeObject('sc-item');
        classNames.pushObject('sc-group-item');
        elem.setClass({ 'sc-item': NO, 'sc-group-item': YES });
      }
    }
    // Wrap up.
    itemView.endPropertyChanges();
  },

  /** @private
    Removes the item view, pooling it for re-use if possible.
  */
  _removeItemView: function (itemView, idx) {
    var exampleView,
      items = this.get('content'),
      layout,
      pool,
      prototype,
      wasPooled = false;

    // Don't pool views whose content has changed, because if the example
    // view used is different than the new content, we would pool the wrong
    // type of view.
    if (items && itemView.get('content') === items.objectAt(idx)) {

      exampleView = this._exampleViewForContentIndex(idx);
      if (SC.none(exampleView.prototype.isReusable) || exampleView.prototype.isReusable) {
        // If the exampleView is reusable, send the view to its pool.
        pool = this._poolForExampleView(exampleView);

        //@if(debug)
        // Add a bit of developer support if they are migrating over from SC.CollectionFastPath
        if (itemView.hibernateInPool) {
          SC.error("Developer Error: Item views that want to do clean up before being pooled should implement sleepInPool not hibernateInPool.  This will be temporarily fixed up for development mode only, but must be changed before production.");
          itemView.sleepInPool = itemView.hibernateInPool;
        }
        //@endif

        // Give the view a chance to do some clean up before sleeping.
        if (itemView.sleepInPool) { itemView.sleepInPool(this); }

        pool.push(itemView);

        // If the exampleView's layer isn't reusable, destroy it.
        prototype = exampleView.prototype;
        if (!SC.none(prototype.isLayerReusable) && !prototype.isLayerReusable) {
          itemView.destroyLayer();
        } else {
          // If the layer is sticking around, be sure to move it out of view.
          layout = this._poolLayoutForContentIndex(idx);
          itemView.set('layout', layout);
        }

        // Ensure that the id of views in the pool don't clash with ids that
        // are used outside of it.
        itemView.set('layerId', SC.generateGuid(null, 'pool-'));

        wasPooled = true;
      }
    }

    if (!wasPooled) {
      itemView.destroy();
    }

    // Remove the cached view (can still exist in the pool)
    delete this._sc_itemViews[idx];
  }


});
