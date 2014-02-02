// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/**
  @class

  SegmentViews are the views used and arranged by SC.SegmentedView and are very similar to a SC.ButtonView
  without any event handling.  The event handling is done by the parent view.

  @extends SC.View
  @since SproutCore 1.5
*/
SC.SegmentView = SC.View.extend(SC.Control,
/** @scope SC.SegmentView.prototype */{

  /**
    @type String
    @default 'tab'
    @readOnly
  */
  //ariaRole: 'tab',
  ariaRole: 'button', // workaround for <rdar://problem/10444670>; switch back to 'tab' later with <rdar://problem/10463928> (also see segmented.js)

  /**
    @type Boolean
    @default YES
    @readOnly
  */
  isSegment: YES,

  /**
    @type Array
    @default ['sc-segment-view']
    @see SC.View#classNames
  */
  classNames: ['sc-segment-view'],

  /**
    @type String
    @default null
    @see SC.View#toolTip
  */
  toolTip: null,

  /**
    @type Boolean
    @default NO
    @see SC.Control#isActive
  */
  isActive: NO,

  /**
    @type Boolean
    @default NO
    @see SC.Control#isSelected
  */
  isSelected: NO,

  /**
    Change the layout direction to make this a vertical segment instead of horizontal ones.
    Possible values:

      - SC.LAYOUT_HORIZONTAL
      - SC.LAYOUT_VERTICAL

    @type String
    @default SC.LAYOUT_HORIZONTAL
  */
  layoutDirection: SC.LAYOUT_HORIZONTAL,

  /**
    @type String
    @default null
    @see SC.Control#controlSize
  */
  controlSize: null,

  /**
    @type Boolean
    @default NO
    @see SC.ButtonView#supportFocusRing
  */
  supportFocusRing: NO,

  // TODO: isDefault, isCancel, value not really used by render delegate
  displayProperties: ['icon', 'displayTitle', 'value', 'displayToolTip', 'isDefault', 'isCancel', 'width', 'isSegment','isFirstSegment', 'isMiddleSegment', 'isLastSegment', 'isOverflowSegment', 'index', 'layoutDirection'],

  /**
    @type String
    @default 'segmentRenderDelegate'
  */
  renderDelegateName: 'segmentRenderDelegate',

  /**
    @type Boolean
    @default YES
  */
  useStaticLayout: YES,


  // ..........................................................
  // Properties
  //

  /**
    @type String
    @default ""
  */
  title: "",

  /**
    @type Object
    @default null
  */
  value: null,

  /**
    @type String
    @default null
  */
  icon: null,

  /**
    @type Boolean
    @default null
  */
  localize: NO,

  /**
    @type String
    @default null
  */
  keyEquivalent: null,

  // TODO: Modification currently unsupported in SegmentedView
  /**
    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  // TODO: Modification currently unsupported in SegmentedView
  /**
    @type Boolean
    @default YES
  */
  needsEllipsis: YES,

  /**
    Localized title.

    @field
    @type String
    @default ""
  */
  displayTitle: function() {
    var ret = this.get('title');
    if (this.get('localize')) ret = SC.String.loc(ret);
    return ret;
  }.property('title', 'localize').cacheable(),

  /**
    @type Number
    @default null
  */
  width: null,

  /**
    The item represented by this view.

    @type Object
    @default null
  */
  localItem: null,

  /** @private
    Whenever the width property changes, adjust our layout accordingly.
  */
  widthDidChange: function() {
    this.adjust('width', this.get('width'));
  }.observes('width'),

  /** @private
    Update our properties according to our matching item.
  */
  updateItem: function(parentView, item) {
    var itemKeys = parentView.get('itemKeys'),
        itemKey,
        viewKeys = parentView.get('viewKeys'),
        viewKey,
        i;

    for (i = itemKeys.get('length') - 1; i >= 0; i--) {
      itemKey = parentView.get(itemKeys.objectAt(i));
      viewKey = viewKeys.objectAt(i);

      // Don't overwrite the default value if none exists in the item
      if (!SC.none(item.get(itemKey))) this.set(viewKey, item.get(itemKey));
    }

    this.set('localItem', item);
  }
});
