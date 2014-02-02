// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  A tree item is a model object that acts as a node in a tree-like data
  structure such as a hierarchy of folders or outline of items.  This mixin
  can be applied to tree item model objects to customize the way the tree
  information is extracted from the object.

  ## Basic Implementation

  If you add this mixin, you must implement the treeItemChildren property so
  that it returns the current array of child tree items for the receiver.  If
  you do not implement this property the tree item will not function.

  ## Optimizing Branches

  The most common use of this mixin is to override the treeItemBranchIndexes
  property to return an index set of child items that are themselves branches
  in the tree.  Normally the TreeController will need to walk every item in
  your list to determine these branch items.  However by implementing this
  method yourself, you can provide a result faster.

  If none of your child items are branches, override this property to return
  null or an empty index set.

  @since SproutCore 1.0
*/
SC.TreeItemContent = {

  /**
    Walk like a duck.

    @type Boolean
    @default YES
  */
  isTreeItemContent: YES,

  /**
    Property returns the children for this tree item.  The default simply
    returns null.  If you implement this mixin, you MUST implement this
    property to return the actual tree item children for the item.

    @type SC.Array
    @default null
  */
  treeItemChildren: null,

  /**
    The default property used to determine if the tree item is expanded.  You
    can implement you model object to update this property or you can override
    treeItemDisclosureState() to compute the disclosure state however you
    want.

    @type Boolean
    @default YES
  */
  treeItemIsExpanded: YES,

  /**
    Indicates whether the tree item should be rendered as a group or not.
    This property is only useful on the root item in your tree.  Setting it to
    YES on any other item will be ignored.

    @type Boolean
    @default NO
  */
  treeItemIsGrouped: NO,

  /**
    Returns the disclosure state for the tree item, which appears at the
    index of the parent's treeItemChildren array.  The response must be one of
    SC.BRANCH_OPEN, SC.BRANCH_CLOSED or SC.LEAF_NODE.

    If the parent parameter is null, then this item is part of the root
    children array.

    This method will only be called for tree items that have children.  Tree
    items with no children are assumed to be leaf nodes.

    The default implementation uses the treeItemIsExpanded property to
    determine if the item should be open or closed.

    @param {Object} parent the parent item containing this item
    @param {Number} idx the index of the item in the parent
    @returns {Number} branch state
  */
  treeItemDisclosureState: function(parent, idx) {
    return this.get('treeItemIsExpanded') ? SC.BRANCH_OPEN : SC.BRANCH_CLOSED;
  },

  /**
    Collapse the tree item.  The default implementation will change the
    treeItemIsExpanded property, but you can override this method to handle
    collapsing anyway you like.

    @param {Object} parent the parent item containing this item
    @param {Number} idx the index of the item in the parent
    @returns {void}
  */
  treeItemCollapse: function(parent, idx) {
    this.setIfChanged('treeItemIsExpanded', NO);
  },

  /**
    Expand the tree item.  The default implementation will change the
    treeItemIsExpanded property, but you can override this method to handle
    collapsing anyway you like.

    @param {Object} parent the parent item containing this item
    @param {Number} idx the index of the item in the parent
    @returns {void}
  */
  treeItemExpand: function(parent, idx) {
    this.setIfChanged('treeItemIsExpanded', YES);
  },

  /**
    Returns an index set containing the child indexes of the item that are
    themselves branches.  This will only be called on tree items with a branch
    disclosure state.

    If the passed parent and index are both null, then the receiver is the
    root node in the tree.

    The default implementation iterates over the item's children to get the
    disclosure state of each one.  Child items with a branch disclosure state
    will have their index added to the return index set.

    You may want to override this method to provide a more efficient
    implementation if you are working with large data sets and can infer which
    children are branches without iterating over each one.

    If you know for sure that all of the child items for this item are leaf
    nodes and not branches, simply override this method to return null.

    @param {Object} parent the parent item containing this item
    @param {Number} index the index of the item in the parent
    @returns {SC.IndexSet} branch indexes
  */
  treeItemBranchIndexes: function(parent, index) {
    var children = this.get('treeItemChildren'),
        ret, lim, idx, item;

    if (!children) return null ; // nothing to do

    ret = SC.IndexSet.create();
    lim = children.get('length');
    for(idx=0;idx<lim;idx++) {
      if (!(item = children.objectAt(idx))) continue;
      if (!item.get('treeItemChildren')) continue;
      if (item.treeItemDisclosureState(this,idx)!==SC.LEAF_NODE) ret.add(idx);
    }

    return ret.get('length')>0 ? ret : null;
  }

};
