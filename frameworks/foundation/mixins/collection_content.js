// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Used for contentIndexDisclosureState().  Indicates open branch node.

  @type Number
  @constant
*/
SC.BRANCH_OPEN = 0x0011;

/**
  Used for contentIndexDisclosureState().  Indicates closed branch node.

  @type Number
  @constant
*/
SC.BRANCH_CLOSED = 0x0012;

/**
  Used for contentIndexDisclosureState().  Indicates leaf node.

  @type Number
  @constant
*/
SC.LEAF_NODE = 0x0020;

/**
  @namespace

  This mixin provides standard methods used by a CollectionView to provide
  additional meta-data about content in a collection view such as selection
  or enabled state.

  You can apply this mixin to a class that you set as a delegate or to the
  object you set as content.

  @since SproutCore 1.0
*/
SC.CollectionContent = {

  /**
    Used to detect the mixin by SC.CollectionView

    @type Boolean
  */
  isCollectionContent: YES,

  /**
    Return YES if the content index should be selected.  Default behavior
    looks at the selection property on the view.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexIsSelected: function(collection, content, idx) {
    var sel = collection.get('selection');
    return sel ? sel.contains(content, idx) : NO ;
  },

  /**
    Returns YES if the content index should be enabled.  Default looks at the
    isEnabled state of the collection view.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexIsEnabled: function(collection, content, idx) {
    return collection.get('isEnabled');
  },

  // ..........................................................
  // GROUPING
  //

  /**
    Optionally return an index set containing the indexes that may be group
    views.  For each group view, the delegate will actually be asked to
    confirm the view is a group using the contentIndexIsGroup() method.

    If grouping is not enabled, return null.

    @param {SC.CollectionView} collection the calling view
    @param {SC.Array} content the content object
    @return {SC.IndexSet}
  */
  contentGroupIndexes: function(collection, content) {
    return null;
  },

  /**
    Returns YES if the item at the specified content index should be rendered
    using the groupExampleView instead of the regular exampleView.  Note that
    a group view is different from a branch/leaf view.  Group views often
    appear with different layout and a different look and feel.

    Default always returns NO.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexIsGroup: function(collection, content, idx) {
    return NO ;
  },

  // ..........................................................
  // OUTLINE VIEWS
  //

  /**
    Returns the outline level for the item at the specified index.  Can be
    used to display hierarchical lists.

    Default always returns -1 (no outline).

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexOutlineLevel: function(collection, content, idx) {
    return -1;
  },

  /**
    Returns a constant indicating the disclosure state of the item.  Must be
    one of SC.BRANCH_OPEN, SC.BRANCH_CLOSED, SC.LEAF_NODE.  If you return one
    of the BRANCH options then the item may be rendered with a disclosure
    triangle open or closed.  If you return SC.LEAF_NODe then the item will
    be rendered as a leaf node.

    Default returns SC.LEAF_NODE.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexDisclosureState: function(collection, content, idx) {
    return SC.LEAF_NODE;
  },

  /**
    Called to expand a content index item if it is currently in a closed
    disclosure state.  The default implementation does nothing.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {void}
  */
  contentIndexExpand: function(collection, content, idx) {
    SC.Logger.log('contentIndexExpand(%@, %@, %@)'.fmt(collection, content, idx));
  },

  /**
    Called to collapse a content index item if it is currently in an open
    disclosure state.  The default implementation does nothing.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {void}
  */
  contentIndexCollapse: function(collection, content, idx) {
    SC.Logger.log('contentIndexCollapse(%@, %@, %@)'.fmt(collection, content, idx));
  }

};
