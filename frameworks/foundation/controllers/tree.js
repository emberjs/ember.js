// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('private/tree_item_observer');

/*
  TODO Document more
*/

/**
  @class

  A TreeController manages a tree of model objects that you might want to
  display in the UI using a collection view.  For the most part, you should
  work with a TreeController much like you would an ObjectController, except
  that the TreeController will also provide an arrangedObjects property that
  can be used as the content of a CollectionView.

  @extends SC.ObjectController
  @extends SC.SelectionSupport
  @since SproutCore 1.0
*/
SC.TreeController = SC.ObjectController.extend(SC.SelectionSupport,
/** @scope SC.TreeController.prototype */ {

  // ..........................................................
  // PROPERTIES
  //

  /**
    Set to YES if you want the top-level items in the tree to be displayed as
    group items in the collection view.

    @type Boolean
    @default NO
  */
  treeItemIsGrouped: NO,

  /**
    If your content support expanding and collapsing of content, then set this
    property to the name of the key on your model that should be used to
    determine the expansion state of the item.  The default is
    "treeItemIsExpanded"

    @type String
    @default "treeItemIsExpanded"
  */
  treeItemIsExpandedKey: "treeItemIsExpanded",

  /**
    Set to the name of the property on your content object that holds the
    children array for each tree node.  The default is "treeItemChildren".

    @type String
    @default "treeItemChildren"
  */
  treeItemChildrenKey: "treeItemChildren",

  /**
    Returns an SC.Array object that actually will represent the tree as a
    flat array suitable for use by a CollectionView.  Other than binding this
    property as the content of a CollectionView, you generally should not
    use this property directly.  Instead, work on the tree content using the
    TreeController like you would any other ObjectController.

    @type SC.Array
  */
  arrangedObjects: null,

  // ..........................................................
  // PRIVATE
  //

  /** @private - setup observer on init if needed. */
  init: function() {
    sc_super();

    // Initialize arrangedObjects.
    this._contentDidChange();
  },

  /** @private */
  _contentDidChange: function () {
    var arrangedObjects = this.get('arrangedObjects'),
      content = this.get('content');

    if (content) {
      if (arrangedObjects) {
        arrangedObjects.set('item', content);
      } else {
        arrangedObjects = SC.TreeItemObserver.create({ item: content, delegate: this });

        // Bind selection properties across to the observer.
        arrangedObjects.bind('allowsSelection', this, 'allowsSelection');
        arrangedObjects.bind('allowsMultipleSelection', this, 'allowsMultipleSelection');
        arrangedObjects.bind('allowsEmptySelection', this, 'allowsEmptySelection');

        // Observe the enumerable property in order to update the selection when it changes.
        arrangedObjects.addObserver('[]', this, this._sctc_arrangedObjectsContentDidChange);

        this.set('arrangedObjects', arrangedObjects);
      }
    } else {
      // Since there is no content. Destroy the previous tree item observer and indicate that arrangedObjects has changed.
      if (arrangedObjects) {
        arrangedObjects.destroy();
        this.set('arrangedObjects', null);

        // Update the selection if it exists.
        this._sctc_arrangedObjectsContentDidChange();
      }
    }
  }.observes('content'),

  /** @private */
  _sctc_arrangedObjectsContentDidChange: function () {
    this.updateSelectionAfterContentChange();
  }.observes(),

  canSelectGroups: NO,

  /**
    @private

    Returns the first item in arrangedObjects that is not a group.  This uses
    a brute force approach right now; we assume you probably don't have a lot
    of groups up front.
  */
  firstSelectableObject: function () {
    var objects = this.get('arrangedObjects'),
        indexes, len, idx     = 0;

    if (!objects) return null; // fast track

    // other fast track. if you want something fancier use collectionViewDelegate
    if (this.get('canSelectGroups')) return objects.get('firstObject');

    indexes = objects.contentGroupIndexes(null, objects);
    len = objects.get('length');
    while (indexes.contains(idx) && (idx < len)) idx++;
    return idx >= len ? null : objects.objectAt(idx);
  }.property()

});

