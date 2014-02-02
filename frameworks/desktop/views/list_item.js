// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @static
  @constant
*/
SC.LIST_ITEM_ACTION_CANCEL = 'sc-list-item-cancel-action';

/**
  @static
  @constant
*/
SC.LIST_ITEM_ACTION_REFRESH = 'sc-list-item-cancel-refresh';

/**
  @static
  @constant
*/
SC.LIST_ITEM_ACTION_EJECT = 'sc-list-item-cancel-eject';

/**
  @class

  Many times list items need to display a lot more than just a label of text.
  You often need to include checkboxes, icons, right icons, extra counts and
  an action or warning icon to the far right.

  A ListItemView can implement all of this for you in a more efficient way
  than you might get if you simply put together a list item on your own using
  views.

  @extends SC.View
  @extends SC.Control
  @extends SC.InlineEditable
  @since SproutCore 1.0
*/
SC.ListItemView = SC.View.extend(SC.InlineEditable, SC.Control,
/** @scope SC.ListItemView.prototype */ {

  /**
    @type Array
    @default ['sc-list-item-view']
    @see SC.View#classNames
  */
  classNames: ['sc-list-item-view'],

  /**
    @type Array
    @default ['disclosureState', 'escapeHTML']
    @see SC.View#displayProperties
  */
  displayProperties: ['disclosureState', 'escapeHTML', 'isDropTarget'],


  // ..........................................................
  // KEY PROPERTIES
  //

  /**
    The index of the content object in the ListView to which this
    ListItemView belongs.

    For example, if this ListItemView represents the first object
    in a ListView, this property would be 0.

    @type Number
    @default null
    @readOnly
  */
  contentIndex: null,

  /**
    (displayDelegate) True if you want the item view to display an icon.

    If false, the icon on the list item view will be hidden.  Otherwise,
    space will be left for the icon next to the list item view.

    @type Boolean
    @default NO
  */
  hasContentIcon: NO,

  /**
    (displayDelegate) True if you want the item view to display a right icon.

    If false, the icon on the list item view will be hidden.  Otherwise,
    space will be left for the icon next to the list item view.

    @type Boolean
    @default NO
  */
  hasContentRightIcon: NO,

  /**
    (displayDelegate) True if you want space to be allocated for a branch
    arrow.

    If false, the space for the branch arrow will be collapsed.

    @type Boolean
    @default NO
  */
  hasContentBranch: NO,

  /**
    (displayDelegate) The name of the property used for the checkbox value.

    The checkbox will only be visible if this key is not null.

    @type String
    @default null
  */
  contentCheckboxKey: null,

  /**
    The URL or CSS class name to use for the icon. This is only used if
    contentIconKey is null, or returns null from the delegate.

    @type String
    @default null
  */
  icon: null,

  /**
    Whether this item is the drop target of a drag operation.

    If the list view supports the SC.DROP_ON operation, it will set this
    property on whichever list item view is the current target of the drop.

    When true, the 'drop-target' class is added to the element.

    @type Boolean
    @default false
  */
  isDropTarget: NO,

  /**
    (displayDelegate) Property key to use for the icon url

    This property will be checked on the content object to determine the
    icon to display.  It must return either a URL or a CSS class name.

    @type String
    @default NO
  */
  contentIconKey: null,

  /**
    The URL or CSS class name to use for the right icon. This is only used if
    contentRightIconKey is null, or returns null from the delegate.

    @type String
    @default null
  */
  rightIcon: null,

  /**
    (displayDelegate) Property key to use for the right icon url

    This property will be checked on the content object to determine the
    icon to display.  It must return either a URL or a CSS class name.

    @type String
    @default null
  */
  contentRightIconKey: null,

  /**
    (displayDelegate) The name of the property used for label itself

    If null, then the content object itself will be used..

    @type String
    @default null
  */
  contentValueKey: null,

  /**
    IF true, the label value will be escaped to avoid HTML injection attacks.
    You should only disable this option if you are sure you will only
    display content that is already escaped and you need the added
    performance gain.

    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  /**
    (displayDelegate) The name of the property used to find the count of
    unread items.

    The count will only be visible if this property is not null and the
    returned value is not 0.

    @type String
    @default null
  */
  contentUnreadCountKey: null,

  /**
    (displayDelegate) The name of the property used to determine if the item
    is a branch or leaf (i.e. if the branch icon should be displayed to the
    right edge.)

    If this is null, then the branch view will be completely hidden.
    Otherwise space will be allocated for it.

    @type String
    @default null
  */
  contentIsBranchKey: null,

  /**
    Indent to use when rendering a list item with an outline level > 0.  The
    left edge of the list item will be indented by this amount for each
    outline level.

    @type Number
    @default 16
  */
  outlineIndent: 16,

  /**
    Outline level for this list item.  Usually set by the collection view.

    @type Number
    @default 0
  */
  outlineLevel: 0,

  /**
    Disclosure state for this list item.  Usually set by the collection view
    when the list item is created. Possible values:

      - SC.LEAF_NODE
      - SC.BRANCH_OPEN
      - SC.BRANCH_CLOSED

    @type String
    @default SC.LEAF_NODE
  */
  disclosureState: SC.LEAF_NODE,

  /**
    The validator to use for the inline text field created when the list item
    is edited.
  */
  validator: null,

  contentKeys: {
    contentValueKey: 'title',
    contentCheckboxKey: 'checkbox',
    contentIconKey:  'icon',
    contentRightIconKey: 'rightIcon',
    contentUnreadCountKey: 'count',
    contentIsBranchKey: 'branch'
  },

  /** @private */
  contentPropertyDidChange: function () {
    //if (this.get('isEditing')) this.discardEditing();
    if (this.get('contentIsEditable') !== this.contentIsEditable()) {
      this.notifyPropertyChange('contentIsEditable');
    }

    this.displayDidChange();
  },

  /**
    Determines if content is editable or not. Checkboxes and other related
    components will render disabled if an item is not editable.

    @field
    @type Boolean
    @observes content
  */
  contentIsEditable: function () {
    var content = this.get('content');
    return content && (content.get ? content.get('isEditable') !== NO : NO);
  }.property('content').cacheable(),

  /**
    @type Object
    @default SC.InlineTextFieldDelegate
  */
  inlineEditorDelegate: SC.InlineTextFieldDelegate,

  /**
    Finds and retrieves the element containing the label.  This is used
    for inline editing.  The default implementation returns a CoreQuery
    selecting any label elements.   If you override renderLabel() you
    probably need to override this as well.

    @returns {jQuery} jQuery object selecting label elements
  */
  $label: function () {
    return this.$('label');
  },

  /** @private
    Determines if the event occurred inside an element with the specified
    classname or not.
  */
  _isInsideElementWithClassName: function (className, evt) {
    var layer = this.get('layer');
    if (!layer) return NO; // no layer yet -- nothing to do

    var el = SC.$(evt.target);
    var ret = NO;
    while (!ret && el.length > 0 && (el[0] !== layer)) {
      if (el.hasClass(className)) ret = YES;
      el = el.parent();
    }
    el = layer = null; //avoid memory leaks
    return ret;
  },

  /** @private
    Returns YES if the list item has a checkbox and the event occurred
    inside of it.
  */
  _isInsideCheckbox: function (evt) {
    var del = this.displayDelegate;
    var checkboxKey = this.getDelegateProperty('contentCheckboxKey', del);
    return checkboxKey && this._isInsideElementWithClassName('sc-checkbox-view', evt);
  },

  /** @private
    Returns YES if the list item has a disclosure triangle and the event
    occurred inside of it.
  */
  _isInsideDisclosure: function (evt) {
    if (this.get('disclosureState') === SC.LEAF_NODE) return NO;
    return this._isInsideElementWithClassName('sc-disclosure-view', evt);
  },

  /** @private
    Returns YES if the list item has a right icon and the event
    occurred inside of it.
  */
  _isInsideRightIcon: function (evt) {
    var del = this.displayDelegate;
    var rightIconKey = this.getDelegateProperty('hasContentRightIcon', del) || !SC.none(this.rightIcon);
    return rightIconKey && this._isInsideElementWithClassName('right-icon', evt);
  },

  /** @private
    mouseDown is handled only for clicks on the checkbox view or or action
    button.
  */
  mouseDown: function (evt) {
    // if content is not editable, then always let collection view handle the
    // event.
    if (!this.get('contentIsEditable')) return NO;

    // if occurred inside checkbox, item view should handle the event.
    if (this._isInsideCheckbox(evt)) {
      this._addCheckboxActiveState();
      this._isMouseDownOnCheckbox = YES;
      this._isMouseInsideCheckbox = YES;
      return YES; // listItem should handle this event

    } else if (this._isInsideDisclosure(evt)) {
      this._addDisclosureActiveState();
      this._isMouseDownOnDisclosure = YES;
      this._isMouseInsideDisclosure = YES;
      return YES;
    } else if (this._isInsideRightIcon(evt)) {
      this._addRightIconActiveState();
      this._isMouseDownOnRightIcon = YES;
      this._isMouseInsideRightIcon = YES;
      return YES;
    }

    return NO; // let the collection view handle this event
  },

  /** @private */
  mouseUp: function (evt) {
    var ret = NO, del, checkboxKey, content, state, idx, set;

    // if mouse was down in checkbox -- then handle mouse up, otherwise
    // allow parent view to handle event.
    if (this._isMouseDownOnCheckbox) {

      // update only if mouse inside on mouse up...
      if (this._isInsideCheckbox(evt)) {
        del = this.displayDelegate;
        checkboxKey = this.getDelegateProperty('contentCheckboxKey', del);
        content = this.get('content');
        if (content && content.get) {
          var value = content.get(checkboxKey);
          value = (value === SC.MIXED_STATE) ? YES : !value;
          content.set(checkboxKey, value); // update content
          this.displayDidChange(); // repaint view...
        }
      }

      this._removeCheckboxActiveState();
      ret = YES;

    // if mouse as down on disclosure -- handle mouse up.  otherwise pass on
    // to parent.
    } else if (this._isMouseDownOnDisclosure) {
      if (this._isInsideDisclosure(evt)) {
        state = this.get('disclosureState');
        idx   = this.get('contentIndex');
        set   = (!SC.none(idx)) ? SC.IndexSet.create(idx) : null;
        del = this.get('displayDelegate');

        if (state === SC.BRANCH_OPEN) {
          if (set && del && del.collapse) del.collapse(set);
          else this.set('disclosureState', SC.BRANCH_CLOSED);
          this.displayDidChange();

        } else if (state === SC.BRANCH_CLOSED) {
          if (set && del && del.expand) del.expand(set);
          else this.set('disclosureState', SC.BRANCH_OPEN);
          this.displayDidChange();
        }
      }

      this._removeDisclosureActiveState();
      ret = YES;
    // if mouse was down in right icon -- then handle mouse up, otherwise
    // allow parent view to handle event.
    } else if (this._isMouseDownOnRightIcon) {
      this._removeRightIconActiveState();
      ret = YES;
    }

    // clear cached info
    this._isMouseInsideCheckbox = this._isMouseDownOnCheckbox = NO;
    this._isMouseDownOnDisclosure = this._isMouseInsideDisclosure = NO;
    this._isMouseInsideRightIcon = this._isMouseDownOnRightIcon = NO;
    return ret;
  },

  /** @private */
  mouseMoved: function (evt) {
    if (this._isMouseDownOnCheckbox && this._isInsideCheckbox(evt)) {
      this._addCheckboxActiveState();
      this._isMouseInsideCheckbox = YES;
    } else if (this._isMouseDownOnCheckbox) {
      this._removeCheckboxActiveState();
      this._isMouseInsideCheckbox = NO;
    } else if (this._isMouseDownOnDisclosure && this._isInsideDisclosure(evt)) {
      this._addDisclosureActiveState();
      this._isMouseInsideDisclosure = YES;
    } else if (this._isMouseDownOnDisclosure) {
      this._removeDisclosureActiveState();
      this._isMouseInsideDisclosure = NO;
    } else if (this._isMouseDownOnRightIcon && this._isInsideRightIcon(evt)) {
      this._addRightIconActiveState();
      this._isMouseInsideRightIcon = YES;
    } else if (this._isMouseDownOnRightIcon) {
      this._removeRightIconActiveState();
      this._isMouseInsideRightIcon = NO;
    }

    return NO;
  },

  /** @private */
  touchStart: function (evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function (evt) {
    return this.mouseUp(evt);
  },

  /** @private */
  touchEntered: function (evt) {
    return this.mouseEntered(evt);
  },

  /** @private */
  touchExited: function (evt) {
    return this.mouseExited(evt);
  },


  /** @private */
  _addCheckboxActiveState: function () {
    if (this.get('isEnabled')) {
      if (this._checkboxRenderDelegate) {
        var source = this._checkboxRenderSource;

        source.set('isActive', YES);

        this._checkboxRenderDelegate.update(source, this.$('.sc-checkbox-view'));
      } else {
        // for backwards-compatibility.
        this.$('.sc-checkbox-view').addClass('active');
      }
    }
  },

  /** @private */
  _removeCheckboxActiveState: function () {
    if (this._checkboxRenderer) {
      var source = this._checkboxRenderSource;

      source.set('isActive', NO);

      this._checkboxRenderDelegate.update(source, this.$('.sc-checkbox-view'));
    } else {
      // for backwards-compatibility.
      this.$('.sc-checkbox-view').removeClass('active');
    }
  },

  /** @private */
  _addDisclosureActiveState: function () {
    if (this.get('isEnabled')) {
      if (this._disclosureRenderDelegate) {
        var source = this._disclosureRenderSource;
        source.set('isActive', YES);

        this._disclosureRenderDelegate.update(source, this.$('.sc-disclosure-view'));
      } else {
        // for backwards-compatibility.
        this.$('.sc-disclosure-view').addClass('active');
      }

    }
  },

  /** @private */
  _removeDisclosureActiveState: function () {
    if (this._disclosureRenderer) {
      var source = this._disclosureRenderSource;
      source.set('isActive', NO);

      this._disclosureRenderDelegate.update(source, this.$('.sc-disclosure-view'));
    } else {
      // for backwards-compatibility.
      this.$('.sc-disclosure-view').addClass('active');
    }
  },

  /** @private */
  _addRightIconActiveState: function () {
    this.$('img.right-icon').setClass('active', YES);
  },

  /** @private */
  _removeRightIconActiveState: function () {
    this.$('img.right-icon').removeClass('active');

    var pane = this.get('pane'),
        del = this.displayDelegate,
        target = this.getDelegateProperty('rightIconTarget', del),
        action = this.getDelegateProperty('rightIconAction', del);

    if (action && pane) {
       pane.rootResponder.sendAction(action, target, this, pane);
    }

  },

  /** @private
    Returns true if a click is on the label text itself to enable editing.

    Note that if you override renderLabel(), you probably need to override
    this as well, or just $label() if you only want to control the element
    returned.

    @param evt {Event} the mouseUp event.
    @returns {Boolean} YES if the mouse was on the content element itself.
  */
  contentHitTest: function (evt) {
    // if not content value is returned, not much to do.
    var del = this.displayDelegate;
    var labelKey = this.getDelegateProperty('contentValueKey', del);
    if (!labelKey) return NO;

    // get the element to check for.
    var el = this.$label()[0];
    if (!el) return NO; // no label to check for.

    var cur = evt.target, layer = this.get('layer');
    while (cur && (cur !== layer) && (cur !== window)) {
      if (cur === el) return YES;
      cur = cur.parentNode;
    }

    return NO;
  },

  /*
    Edits the label portion of the list item. If scrollIfNeeded is YES, will
    scroll to the item before editing it.

    @params {Boolean} if the parent scroll view should be scrolled to this item
      before editing begins
    @returns {Boolean} YES if successful
  */
  beginEditing: function (original, scrollIfNeeded) {
    var el        = this.$label(),
        parent    = this.get('parentView');

    // if possible, find a nearby scroll view and scroll into view.
    // HACK: if we scrolled, then wait for a loop and get the item view again
    // and begin editing.  Right now collection view will regenerate the item
    // view too often.
    if (scrollIfNeeded && this.scrollToVisible()) {
      var collectionView = this.get('owner'),
        idx = this.get('contentIndex');

      this.invokeLast(function () {
        var item = collectionView.itemViewForContentIndex(idx);
        if (item && item.beginEditing) item.beginEditing(NO);
      });
      return YES; // let the scroll happen then begin editing...
    }

    else if (!parent || !el || el.get('length') === 0) return NO;

    else return original();
  }.enhance(),

  /*
    Configures the editor to overlay the label properly.
  */
  inlineEditorWillBeginEditing: function (editor, editable, value) {
    var content   = this.get('content'),
        del       = this.get('displayDelegate'),
        labelKey  = this.getDelegateProperty('contentValueKey', del),
        el        = this.$label(),
        validator = this.get('validator'),
        f, v, offset, fontSize, top, lineHeight, escapeHTML,
        lineHeightShift, targetLineHeight;

    v = (labelKey && content) ? (content.get ? content.get(labelKey) : content[labelKey]) : content;

    f = this.computeFrameWithParentFrame(null);

    // if the label has a large line height, try to adjust it to something
    // more reasonable so that it looks right when we show the popup editor.
    lineHeight = this._oldLineHeight = el.css('lineHeight');
    fontSize = el.css('fontSize');
    top = this.$().css('top');

    if (top) top = parseInt(top.substring(0, top.length - 2), 0);
    else top = 0;

    lineHeightShift = 0;

    if (fontSize && lineHeight) {
      targetLineHeight = fontSize * 1.5;
      if (targetLineHeight < lineHeight) {
        el.css({ lineHeight: '1.5' });
        lineHeightShift = (lineHeight - targetLineHeight) / 2;
      } else this._oldLineHeight = null;
    }

    el = el[0];
    offset = SC.offset(el);

    f.x = offset.x;
    f.y = offset.y + top + lineHeightShift;
    f.height = el.offsetHeight;
    f.width = el.offsetWidth;

    escapeHTML = this.get('escapeHTML');

    editor.set({
      value: v,
      exampleFrame: f,
      exampleElement: el,
      multiline: NO,
      validator: validator,
      escapeHTML: escapeHTML
    });
  },

  /** @private
    Allow editing.
  */
  inlineEditorShouldBeginEditing: function (inlineEditor) {
    return YES;
  },

  /** @private
   Hide the label view while the inline editor covers it.
  */
  inlineEditorDidBeginEditing: function (original, inlineEditor, value, editable) {
    original(inlineEditor, value, editable);

    var el = this.$label();
    this._oldOpacity = el.css('opacity');
    el.css('opacity', 0.0);

    // restore old line height for original item if the old line height
    // was saved.
    if (this._oldLineHeight) el.css({ lineHeight: this._oldLineHeight });
  }.enhance(),

  /** @private
   Update the field value and make it visible again.
  */
  inlineEditorDidCommitEditing: function (editor, finalValue, editable) {
    var content = this.get('content');
    var del = this.displayDelegate;
    var labelKey = this.getDelegateProperty('contentValueKey', del);

    if (labelKey && content) {
      if (content.set) content.set(labelKey, finalValue);
      else content[labelKey] = finalValue;
    }

    else this.set('content', finalValue);

    this.displayDidChange();

    this._endEditing();
  },

  _endEditing: function (original) {
    this.$label().css('opacity', this._oldOpacity);

    original();
  }.enhance(),

  /** SC.ListItemView is not able to update itself in place at this time. */
  // TODO: add update: support.
  isReusable: false,

  /** @private
    Fills the passed html-array with strings that can be joined to form the
    innerHTML of the receiver element.  Also populates an array of classNames
    to set on the outer element.

    @param {SC.RenderContext} context
    @param {Boolean} firstTime
    @returns {void}
  */
  render: function (context, firstTime) {
    var content = this.get('content'),
        del     = this.displayDelegate,
        level   = this.get('outlineLevel'),
        indent  = this.get('outlineIndent'),
        key, value, working, classArray = [];

    // add alternating row classes
    classArray.push((this.get('contentIndex') % 2 === 0) ? 'even' : 'odd');
    context.setClass('disabled', !this.get('isEnabled'));
    context.setClass('drop-target', this.get('isDropTarget'));

    // outline level wrapper
    working = context.begin("div").addClass("sc-outline");
    if (level >= 0 && indent > 0) working.addStyle("left", indent * (level + 1));

    // handle disclosure triangle
    value = this.get('disclosureState');
    if (value !== SC.LEAF_NODE) {
      this.renderDisclosure(working, value);
      classArray.push('has-disclosure');
    } else if (this._disclosureRenderSource) {
      // If previously rendered a disclosure, clean up.
      context.removeClass('has-disclosure');
      this._disclosureRenderSource.destroy();

      this._disclosureRenderSource = this._disclosureRenderDelegate = null;
    }

    // handle checkbox
    key = this.getDelegateProperty('contentCheckboxKey', del);
    if (key) {
      value = content ? (content.get ? content.get(key) : content[key]) : NO;
      if (value !== null) {
        this.renderCheckbox(working, value);
        classArray.push('has-checkbox');
      } else if (this._checkboxRenderSource) {
        // If previously rendered a checkbox, clean up.
        context.removeClass('has-checkbox');
        this._checkboxRenderSource.destroy();

        this._checkboxRenderSource = this._checkboxRenderDelegate = null;
      }
    }

    // handle icon
    if (this.getDelegateProperty('hasContentIcon', del)) {
      key = this.getDelegateProperty('contentIconKey', del);
      value = (key && content) ? (content.get ? content.get(key) : content[key]) : null;

      if (value) {
        this.renderIcon(working, value);
        classArray.push('has-icon');
      }
    } else if (this.get('icon')) {
      value = this.get('icon');
      this.renderIcon(working, value);
      classArray.push('has-icon');
    }

    // handle label -- always invoke
    key = this.getDelegateProperty('contentValueKey', del);
    value = (key && content) ? (content.get ? content.get(key) : content[key]) : content;
    if (value && SC.typeOf(value) !== SC.T_STRING) value = value.toString();
    if (this.get('escapeHTML')) value = SC.RenderContext.escapeHTML(value);
    this.renderLabel(working, value);

    // handle right icon
    if (this.getDelegateProperty('hasContentRightIcon', del)) {
      key = this.getDelegateProperty('contentRightIconKey', del);
      value = (key && content) ? (content.get ? content.get(key) : content[key]) : null;

      if (value) {
        this.renderRightIcon(working, value);
        classArray.push('has-right-icon');
      }
    } else if (this.get('rightIcon')) {
      value = this.get('rightIcon');
      this.renderRightIcon(working, value);
      classArray.push('has-right-icon');
    }

    // handle unread count
    key = this.getDelegateProperty('contentUnreadCountKey', del);
    value = (key && content) ? (content.get ? content.get(key) : content[key]) : null;
    if (!SC.none(value) && (value !== 0)) {
      this.renderCount(working, value);
      var digits = ['zero', 'one', 'two', 'three', 'four', 'five'];
      var valueLength = value.toString().length;
      var digitsLength = digits.length;
      var digit = (valueLength < digitsLength) ? digits[valueLength] : digits[digitsLength - 1];
      classArray.push('has-count', digit + '-digit');
    } else {
      // If previously rendered a count, clean up.
      context.removeClass('has-count');
    }

    // handle action
    key = this.getDelegateProperty('listItemActionProperty', del);
    value = (key && content) ? (content.get ? content.get(key) : content[key]) : null;
    if (value) {
      this.renderAction(working, value);
      classArray.push('has-action');
    }

    // handle branch
    if (this.getDelegateProperty('hasContentBranch', del)) {
      key = this.getDelegateProperty('contentIsBranchKey', del);
      value = (key && content) ? (content.get ? content.get(key) : content[key]) : NO;
      this.renderBranch(working, value);
      classArray.push('has-branch');
    }
    context.addClass(classArray);
    context = working.end();
  },

  /** @private
    Adds a disclosure triangle with the appropriate display to the content.
    This method will only be called if the disclosure state of the view is
    something other than SC.LEAF_NODE.

    @param {SC.RenderContext} context the render context
    @param {Boolean} state YES, NO or SC.MIXED_STATE
    @returns {void}
  */
  renderDisclosure: function (context, state) {
    var renderer = this.get('theme').disclosureRenderDelegate;

    context = context.begin('div')
      .addClass('sc-disclosure-view')
      .addClass('sc-regular-size')
      .addClass(this.get('theme').classNames)
      .addClass(renderer.get('className'));

    var source = this._disclosureRenderSource;
    if (!source) {
      this._disclosureRenderSource = source =
      SC.Object.create({ renderState: {}, theme: this.get('theme') });
    }

    source
      .set('isSelected', state === SC.BRANCH_OPEN)
      .set('isEnabled', this.get('isEnabled'))
      .set('title', '');

    renderer.render(source, context);

    context = context.end();
    this._disclosureRenderDelegate = renderer;
  },

  /** @private
    Adds a checkbox with the appropriate state to the content.  This method
    will only be called if the list item view is supposed to have a
    checkbox.

    @param {SC.RenderContext} context the render context
    @param {Boolean} state YES, NO or SC.MIXED_STATE
    @returns {void}
  */
  renderCheckbox: function (context, state) {
    var renderer = this.get('theme').checkboxRenderDelegate;

    // note: checkbox-view is really not the best thing to do here; we should do
    // sc-list-item-checkbox; however, themes expect something different, unfortunately.
    context = context.begin('div')
      .addClass('sc-checkbox-view')
      .addClass('sc-regular-size')
      .addClass(this.get('theme').classNames)
      .addClass(renderer.get('className'));

    var source = this._checkboxRenderSource;
    if (!source) {
      source = this._checkboxRenderSource =
      SC.Object.create({ renderState: {}, theme: this.get('theme') });
    }

    source
      .set('isSelected', state && (state !== SC.MIXED_STATE))
      .set('isEnabled', this.get('isEnabled') && this.get('contentIsEditable'))
      .set('isActive', this._checkboxIsActive)
      .set('title', '');

    renderer.render(source, context);
    context = context.end();

    this._checkboxRenderDelegate = renderer;
  },

  /** @private
    Generates an icon for the label based on the content.  This method will
    only be called if the list item view has icons enabled.  You can override
    this method to display your own type of icon if desired.

    @param {SC.RenderContext} context the render context
    @param {String} icon a URL or class name.
    @returns {void}
  */
  renderIcon: function (context, icon) {
    // get a class name and url to include if relevant
    var url = null, className = null, classArray = [];
    if (icon && SC.ImageView.valueIsUrl(icon)) {
      url = icon;
      className = '';
    } else {
      className = icon;
      url = SC.BLANK_IMAGE_URL;
    }

    // generate the img element...
    classArray.push(className, 'icon');
    context.begin('img')
            .addClass(classArray)
            .setAttr('src', url)
            .end();
  },

  /** @private
   Generates a label based on the content.  You can override this method to
   display your own type of icon if desired.

   @param {SC.RenderContext} context the render context
   @param {String} label the label to display, already HTML escaped.
   @returns {void}
  */
  renderLabel: function (context, label) {
    context.push('<label>', label || '', '</label>');
  },

  /** @private
    Generates a right icon for the label based on the content.  This method will
    only be called if the list item view has icons enabled.  You can override
    this method to display your own type of icon if desired.

    @param {SC.RenderContext} context the render context
    @param {String} icon a URL or class name.
    @returns {void}
  */
  renderRightIcon: function (context, icon) {
    // get a class name and url to include if relevant
    var url = null,
      className = null,
      classArray = [];
    if (icon && SC.ImageView.valueIsUrl(icon)) {
      url = icon;
      className = '';
    } else {
      className = icon;
      url = SC.BLANK_IMAGE_URL;
    }

    // generate the img element...
    classArray.push('right-icon', className);
    context.begin('img')
      .addClass(classArray)
      .setAttr('src', url)
    .end();
  },

  /** @private
   Generates an unread or other count for the list item.  This method will
   only be called if the list item view has counts enabled.  You can
   override this method to display your own type of counts if desired.

   @param {SC.RenderContext} context the render context
   @param {Number} count the count
   @returns {void}
  */
  renderCount: function (context, count) {
    context.push('<span class="count"><span class="inner">',
                  count.toString(), '</span></span>');
  },

  /** @private
    Generates the html string used to represent the action item for your
    list item.  override this to return your own custom HTML

    @param {SC.RenderContext} context the render context
    @param {String} actionClassName the name of the action item
    @returns {void}
  */
  renderAction: function (context, actionClassName) {
    context.push('<img src="', SC.BLANK_IMAGE_URL, '" class="action" />');
  },

  /** @private
   Generates the string used to represent the branch arrow. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @param {Boolean} hasBranch YES if the item has a branch
   @returns {void}
  */
  renderBranch: function (context, hasBranch) {
    var classArray = [];
    classArray.push('branch', hasBranch ? 'branch-visible' : 'branch-hidden');
    context.begin('span')
          .addClass(classArray)
          .push('&nbsp;')
          .end();
  }

});

SC.ListItemView._deprecatedRenderWarningHasBeenIssued = false;
