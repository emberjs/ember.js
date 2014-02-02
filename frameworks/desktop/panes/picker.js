// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/palette');

/**
  Popular customized picker position rules:
  default: initiated just below the anchor.
           shift x, y to optimized picker visibility and make sure top-left corner is always visible.
  menu :   same as default rule +
           default(1, 4, 3) or custom offset below the anchor for default location to fine tuned visual alignment +
           enforce min left(7px)/right(8px) padding to the window
  fixed :  default(1, 4, 3) or custom offset below the anchor for default location to cope with specific anchor and skip fitPositionToScreen
  pointer :take default [0, 1, 2, 3, 2] or custom matrix to choose one of four perfect pointer positions.Ex:
           perfect right (0) > perfect left (1) > perfect top (2) > perfect bottom (3)
           fallback to perfect top (2)
  menu-pointer :take default [3, 0, 1, 2, 3] or custom matrix to choose one of four perfect pointer positions.Ex:
          perfect bottom (3) > perfect right (0) > perfect left (1) > perfect top (2)
          fallback to perfect bottom (3)
*/

/**
  @type String
  @constant
  @static
*/
SC.PICKER_MENU = 'menu';

/**
  @type String
  @constant
  @static
*/
SC.PICKER_FIXED = 'fixed';

/**
  @type String
  @constant
  @static
*/
SC.PICKER_POINTER = 'pointer';

/**
  @type String
  @constant
  @static
*/
SC.PICKER_MENU_POINTER = 'menu-pointer';

/**
  Pointer layout for perfect right/left/top/bottom.

  @constant
  @static
*/
SC.POINTER_LAYOUT = ["perfectRight", "perfectLeft", "perfectTop", "perfectBottom"];

/**
  @class

  Display a non-modal pane that automatically repositions around a view so as
  to remain visible.

  An `SC.PickerPane` repositions around the view to which it is anchored as the
  browser window is resized so as to ensure the pane's content remains visible.
  A picker pane is useful for displaying supplementary information and does not
  block the user's interaction with other UI elements. Picker panes typically
  provide a better user experience than modal panels.

  An `SC.PickerPane` repositions itself according to the optional `preferMatrix`
  argument passed in the `.popup()` method call. The `preferMatrix` either
  specifies an offset-based arrangement behavior or a position-based arrangement
  behavior depending on the `preferType` argument in the `.popup()` call.

  The simplest way to create and display a picker pane:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(someView);

  This displays the `SC.PickerPane` anchored to `someView`.

  ## Positioning

  Picker pane positioning can be classified into two broad categories:
  offset-based and position-based.

  ### Offset-based

  When `preferType` is unspecified, `SC.PICKER_MENU` or `SC.PICKER_FIXED`, then
  the `preferMatrix` array describes the offset that is used to position the
  pane below the anchor. The offset is described by an array of three values,
  defaulting to `[1, 4, 3]`. The first value controls the x offset and the second
  value the y offset. The third value can be `0` (right) or `3` (bottom),
  controlling whether the origin of the pane is further offset by the width
  (in the case of 0) or the height (in the case of 3) of the anchor.

  ### Position-based

  When `preferType` is `SC.PICKER_POINTER` or `SC.PICKER_MENU_POINTER`, then
  the `preferMatrix` specifies the sides in the order in which you want the
  `SC.PickerPane` to try to arrange itself around the view to which it is
  anchored. The fifth element in the `preferMatrix` specifies which side the
  `SC.PickerPane` should display on when there isn't enough space around any
  of the preferred sides.

  Anchor sides are defined by their index in `SC.POINTER_LAYOUT`, where right
  is `0`, left is `1`, top is `2`, and bottom is `3`.

  For example, the `preferMatrix` of `[3, 0, 1, 2, 2]` says: "Display below the
  anchor (3); if there isn't enough space then display to the right of the anchor (0).
  If there isn't enough space either below or to the right of the anchor, then appear
  to the left (1), unless there is also no space on the left, in which case display
  above the anchor (2)."

  ## Position Rules

  When invoking `.popup()` you can optionally specify a picker position rule with
  the `preferType` argument.

  If no `preferType` is specified, the picker pane is displayed just below the anchor.
  The pane will reposition automatically for optimal visibility, ensuring the top-left
  corner is visible.

  These position rules have the following behaviors:

  ### `SC.PICKER_MENU`

  Positioning is offset-based, with `preferMatrix` defaulting to `[1, 4, 3]`.
  Furthermore, a minimum left and right padding to window, of 7px and 8px, respectively,
  is enforced.


  ### `SC.PICKER_FIXED`

  Positioning is offset-based, with `preferMatrix` defaulting to `[1, 4, 3]` and
  skipping `fitPositionToScreen`.


  ### `SC.PICKER_POINTER`

  Positioning is position-based, with `preferMatrix` defaulting to `[0, 1, 2, 3, 2]`,
  i.e. right > left > top > bottom; fallback to top.


  ### `SC.PICKER_MENU_POINTER`

  Positioning is position-based, with `preferMatrix` defaulting to `[3, 0, 1, 2, 3]`,
  i.e. bottom, right, left, top; fallback to bottom.



  ## Examples

  Examples for applying popular customized picker position rules:

  ### default:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor);

  ### menu below the anchor with default `preferMatrix` of `[1, 4, 3]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_MENU);

  ### menu on the right side of anchor with custom `preferMatrix` of `[2, 6, 0]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_MENU, [2, 6, 0]);

  ### fixed below the anchor with default `preferMatrix` of `[1, 4, 3]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_FIXED);

  ### fixed on the right side of anchor with `preferMatrix` of `[-22,-17, 0]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_FIXED, [-22,-17, 0]);

  ### pointer with default `preferMatrix` of `[0, 1, 2, 3, 2]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_POINTER);

  Positioning: right (0) > left (1) > top (2) > bottom (3). Fallback to top (2).

  ### pointer with custom `preferMatrix` of `[3, 0, 1, 2, 2]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_POINTER, [3, 0, 1, 2, 2]);

  Positioning: bottom (3) > right (0) > left (1) > top (2). Fallback to top (2).

  ### menu-pointer with default `preferMatrix` of `[3, 0, 1, 2, 3]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_MENU_POINTER);

  Positioning: bottom (3) > right (0) > left (1) > top (2). Fallback to bottom (3).

  @extends SC.PalettePane
  @since SproutCore 1.0
*/
SC.PickerPane = SC.PalettePane.extend(
/** @scope SC.PickerPane.prototype */ {

  /**
    @type Array
    @default ['sc-picker']
    @see SC.View#classNames
  */
  classNames: ['sc-picker'],

  /**
    @type Boolean
    @default YES
  */
  isAnchored: YES,

  /**
    @type Boolean
    @default YES
  */
  isModal: YES,

  /** @private
    @type String
    @default 'perfectRight'
  */
  pointerPos: 'perfectRight',

  /** @private
    @type Number
    @default 0
  */
  pointerPosX: 0,

  /** @private
    @type Number
    @default 0
  */
  pointerPosY: 0,

  /** @private
    When calling `popup`, you pass a view or element to anchor the pane. This
    property returns the anchor element. (If you've anchored to a view, this
    is its layer.) You can use this to properly position your view.

    @type HTMLElement
    @default null
  */
  anchorElement: function (key, value) {
    // Getter
    if (value === undefined) {
      if (this._anchorView) return this._anchorView.get('layer');
      else return this._anchorHTMLElement;
    }
    // Setter
    else {
      if (!value) {
        throw "You must set 'anchorElement' to either a view or a DOM element";
      }
      // Clean up any previous anchor elements.
      this._removeScrollObservers();

      if (value.isView) {
        this._setupScrollObservers(value);
        this._anchorView        = value;
        this._anchorHTMLElement = null;
        return value.get('layer');
      }
      else {
        // TODO: We could setupScrollObservers on passed elements too, but it would
        // be a bit more complicated.
        this._anchorView        = null;
        this._anchorHTMLElement = value;
        return value;
      }
    }
  }.property().cacheable(),

  /** @private
    anchor rect calculated by computeAnchorRect from init popup

    @type Hash
    @default null
  */
  anchorCached: null,

  /**
    popular customized picker position rule

    @type String
    @default null
  */
  preferType: null,

  /**
    default/custom offset or position pref matrix for specific preferType

    @type String
    @default null
  */
  preferMatrix: null,

  /**
    default/custom offset of pointer for picker-pointer or pointer-menu

    @type Array
    @default null
  */
  pointerOffset: null,

  /** @deprecated Version 1.10.  Use windowPadding instead.
    default offset of extra-right pointer for picker-pointer or pointer-menu

    @type Number
    @default 0
  */
  extraRightOffset: function () {
    //@if (debug)
    SC.warn('SC.PickerPane#extraRightOffset is deprecated.  The pointer will position itself automatically.');
    //@endif

    return this.get('windowPadding');
  }.property('windowPadding').cacheable(),

  /**
    The target object to invoke the remove action on when the user clicks off the
    picker that is to be removed.

    If you set this target, the action will be called on the target object
    directly when the user clicks off the picker. If you leave this property
    set to null, then the button will search the responder chain for a view that
    implements the action when the button is pressed instead.

    @type Object
    @default null
  */
  removeTarget: null,

  /**
    The name of the action you want triggered when the user clicks off the
    picker pane that is to be removed.

    This property is used in conjunction with the removeTarget property to execute
    a method when the user clicks off the picker pane.

    If you do not set a target, then clicking off the picker pane will cause the
    responder chain to search for a view that implements the action you name
    here, if one was provided.

    Note that this property is optional. If no explicit value is provided then the
    picker pane will perform the default action which is to simply remove itself.

    @type String
    @default null
  */
  removeAction: null,


  /**
    Disable repositioning as the window or size changes. It stays in the original
    popup position.

    @type Boolean
    @default NO
  */
  repositionOnWindowResize: YES,


  /** @private
    Default padding around the window's edge that the pane will not overlap.

    This value is set to the value of SC.PickerPane.WINDOW_PADDING, except when
    using preferType of SC.PICKER_MENU_POINTER, where it will be set according
    to the `controlSize` value of the pane to one of:

      SC.PickerPane.TINY_MENU_WINDOW_PADDING
      SC.PickerPane.SMALL_MENU_WINDOW_PADDING
      SC.PickerPane.REGULAR_MENU_WINDOW_PADDING
      SC.PickerPane.LARGE_MENU_WINDOW_PADDING
      SC.PickerPane.HUGE_MENU_WINDOW_PADDING

    @type Number
    @default SC.PickerPane.WINDOW_PADDING
  */
  windowPadding: null,

  /* @private Observe the frame for changes so that we can reposition if necessary. */
  borderFrameDidChange: function () {
    this.positionPane(true);
  },

  /**
    Displays a new picker pane.

    @param {SC.View|HTMLElement} anchorViewOrElement view or element to anchor to
    @param {String} [preferType] apply picker position rule
    @param {Array} [preferMatrix] apply custom offset or position pref matrix for specific preferType
    @param {Number} [pointerOffset]
    @returns {SC.PickerPane} receiver
  */
  popup: function (anchorViewOrElement, preferType, preferMatrix, pointerOffset) {
    this.beginPropertyChanges();
    this.setIfChanged('anchorElement', anchorViewOrElement);
    if (preferType) { this.set('preferType', preferType); }
    if (preferMatrix) { this.set('preferMatrix', preferMatrix); }
    if (pointerOffset) { this.set('pointerOffset', pointerOffset); }
    this.endPropertyChanges();
    this.positionPane();
    this._hideOverflow();

    // Start observing the frame for changes.
    this.addObserver('borderFrame', this.borderFrameDidChange);

    return this.append();
  },

  /** @private
    The ideal position for a picker pane is just below the anchor that
    triggered it + offset of specific preferType. Find that ideal position,
    then call fitPositionToScreen to get final position. If anchor is missing,
    fallback to center.
  */
  positionPane: function (useAnchorCached) {
    useAnchorCached = useAnchorCached && this.get('anchorCached');

    var anchor       = useAnchorCached ? this.get('anchorCached') : this.get('anchorElement'),
      frame        = this.get('borderFrame'),
      preferType   = this.get('preferType'),
      preferMatrix = this.get('preferMatrix'),
      layout       = this.get('layout'),
      origin;

    // usually an anchorElement will be passed.  The ideal position is just
    // below the anchor + default or custom offset according to preferType.
    // If that is not possible, fitPositionToScreen will take care of that for
    // other alternative and fallback position.

    if (anchor) {
      if (!useAnchorCached) {
        anchor = this.computeAnchorRect(anchor);
        this.set('anchorCached', anchor);
      }

      origin = SC.cloneRect(anchor);

      if (preferType) {
        switch (preferType) {
        case SC.PICKER_MENU:
        case SC.PICKER_FIXED:
          if (!preferMatrix || preferMatrix.length !== 3) {
            // default below the anchor with fine-tuned visual alignment
            // for Menu to appear just below the anchorElement.
            this.set('preferMatrix', [1, 4, 3]);
          }

          // fine-tuned visual alignment from preferMatrix
          origin.x += ((this.preferMatrix[2] === 0) ? origin.width : 0) + this.preferMatrix[0];
          origin.y += ((this.preferMatrix[2] === 3) ? origin.height : 0) + this.preferMatrix[1];
          break;
        default:
          origin.y += origin.height;
          break;
        }
      } else {
        origin.y += origin.height;
      }

      // Since we repeatedly need to know the half-width and half-height of the
      // frames, add those properties.
      anchor.halfWidth = parseInt(anchor.width * 0.5, 0);
      anchor.halfHeight = parseInt(anchor.height * 0.5, 0);
      frame.halfWidth = parseInt(frame.width * 0.5, 0);
      frame.halfHeight = parseInt(frame.height * 0.5, 0);

      origin = this.fitPositionToScreen(origin, frame, anchor);
      this.adjust({
        width: origin.width,
        height: origin.height,
        left: origin.x,
        top: origin.y
      });
    // if no anchor view has been set for some reason, just center.
    } else {
      this.adjust({
        width: layout.width,
        height: layout.height,
        centerX: 0,
        centerY: 0
      });
    }
    this.updateLayout();

    return this;
  },

  /** @private
    This method will return ret (x, y, width, height) from a rectangular element
    Notice: temp hack for calculating visible anchor height by counting height
    up to window bottom only. We do have 'clippingFrame' supported from view.
    But since our anchor can be element, we use this solution for now.
  */
  computeAnchorRect: function (anchor) {
    var bounding, ret, cq,
        wsize = SC.RootResponder.responder.computeWindowSize();
    // Some browsers natively implement getBoundingClientRect, so if it's
    // available we'll use it for speed.
    if (anchor.getBoundingClientRect) {
      // Webkit and Firefox 3.5 will get everything they need by
      // calling getBoundingClientRect()
      bounding = anchor.getBoundingClientRect();
      ret = {
        x:      bounding.left,
        y:      bounding.top,
        width:  bounding.width,
        height: bounding.height
      };
      // If width and height are undefined this means we are in IE or FF < 3.5
      // if we did not get the frame dimensions the do the calculations
      // based on an element
      if (ret.width === undefined || ret.height === undefined) {
        cq = SC.$(anchor);
        ret.width = cq.outerWidth();
        ret.height = cq.outerHeight();
      }
    } else {
      // Only really old versions will have to go through this code path.
      ret   = SC.offset(anchor); // get x & y
      cq    = SC.$(anchor);
      ret.width = cq.outerWidth();
      ret.height = cq.outerHeight();
    }
    ret.height = (wsize.height - ret.y) < ret.height ? (wsize.height - ret.y) : ret.height;

    if (!SC.browser.isIE && window.scrollX > 0 || window.scrollY > 0) {
      ret.x += window.scrollX;
      ret.y += window.scrollY;
    } else if (SC.browser.isIE && (document.documentElement.scrollTop > 0 || document.documentElement.scrollLeft > 0)) {
      ret.x += document.documentElement.scrollLeft;
      ret.y += document.documentElement.scrollTop;
    }
    return ret;
  },

  /** @private
    This method will dispatch to the right re-position rule according to preferType
  */
  fitPositionToScreen: function (preferredPosition, picker, anchor) {
    var wsize = SC.RootResponder.responder.computeWindowSize(),
        wret = { x: 0, y: 0, width: wsize.width, height: wsize.height };

    // if window size is smaller than the minimum size of app, use minimum size.
    var mainPane = SC.RootResponder.responder.mainPane;
    if (mainPane) {
      var minWidth = mainPane.layout.minWidth,
          minHeight = mainPane.layout.minHeight;

      if (minWidth && wret.width < minWidth) {
        wret.width = mainPane.layout.minWidth;
      }

      if (minHeight && wret.height < minHeight) {
        wret.height = mainPane.layout.minHeight;
      }
    }

    picker.x = preferredPosition.x;
    picker.y = preferredPosition.y;

    if (this.preferType) {
      switch (this.preferType) {
      case SC.PICKER_MENU:
        // apply menu re-position rule
        picker = this.fitPositionToScreenMenu(wret, picker, this.get('isSubMenu'));
        break;
      case SC.PICKER_MENU_POINTER:
        this.setupPointer(anchor);
        picker = this.fitPositionToScreenMenuPointer(wret, picker, anchor);
        break;
      case SC.PICKER_POINTER:
        // apply pointer re-position rule
        this.setupPointer(anchor);
        picker = this.fitPositionToScreenPointer(wret, picker, anchor);
        break;
      case SC.PICKER_FIXED:
        // skip fitPositionToScreen
        break;
      default:
        break;
      }
    } else {
      // apply default re-position rule
      picker = this.fitPositionToScreenDefault(wret, picker, anchor);
    }
    // this.displayDidChange();
    return picker;
  },

  /** @private
    re-position rule migrated from old SC.OverlayPaneView.
    shift x, y to optimized picker visibility and make sure top-left corner is always visible.
  */
  fitPositionToScreenDefault: function (w, f, a) {
    var mx;

    // make sure the right edge fits on the screen.  If not, anchor to
    // right edge of anchor or right edge of window, whichever is closer.
    if (SC.maxX(f) > w.width) {
      mx = Math.max(SC.maxX(a), f.width);
      f.x = Math.min(mx, w.width) - f.width;
    }

    // if the left edge is off of the screen, try to position at left edge
    // of anchor.  If that pushes right edge off screen, shift back until
    // right is on screen or left = 0
    if (SC.minX(f) < 0) {
      f.x = SC.minX(Math.max(a, 0));
      if (SC.maxX(f) > w.width) {
        f.x = Math.max(0, w.width - f.width);
      }
    }

    // make sure bottom edge fits on screen.  If not, try to anchor to top
    // of anchor or bottom edge of screen.
    if (SC.maxY(f) > w.height) {
      mx = Math.max((a.y - f.height), 0);
      if (mx > w.height) {
        f.y = Math.max(0, w.height - f.height);
      } else { f.y = mx; }
    }

    // if Top edge is off screen, try to anchor to bottom of anchor. If that
    // pushes off bottom edge, shift up until it is back on screen or top =0
    if (SC.minY(f) < 0) {
      mx = Math.min(SC.maxY(a), (w.height - a.height));
      f.y = Math.max(mx, 0);
    }
    return f;
  },

  /** @private
    Reposition the pane in a way that is optimized for menus.

    Specifically, we want to ensure that the pane is at least 7 pixels from
    the left side of the screen, and 20 pixels from the right side.

    If the menu is a submenu, we also want to reposition the pane to the left
    of the parent menu if it would otherwise exceed the width of the viewport.
  */
  fitPositionToScreenMenu: function (windowFrame, paneFrame, subMenu) {
    // Set up init location for submenu
    if (subMenu) {
      paneFrame.x -= this.get('submenuOffsetX');
      paneFrame.y -= Math.floor(this.get('menuHeightPadding') / 2);
    }

    // If the right edge of the pane is within 20 pixels of the right edge
    // of the window, we need to reposition it.
    if ((paneFrame.x + paneFrame.width) > (windowFrame.width - 20)) {
      if (subMenu) {
        // Submenus should be re-anchored to the left of the parent menu
        paneFrame.x = paneFrame.x - (paneFrame.width * 2);
      } else {
        // Otherwise, just position the pane 20 pixels from the right edge
        paneFrame.x = windowFrame.width - paneFrame.width - 20;
      }
    }

    // Make sure we are at least 7 pixels from the left edge of the screen.
    if (paneFrame.x < 7) { paneFrame.x = 7; }

    if (paneFrame.y < 7) {
      paneFrame.height += paneFrame.y;
      paneFrame.y = 7;
    }

    // If the height of the menu is bigger than the window height, resize it.
    if (paneFrame.height + paneFrame.y + 35 >= windowFrame.height) {
      if (paneFrame.height + 50 >= windowFrame.height) {
        paneFrame.y = SC.MenuPane.VERTICAL_OFFSET;
        paneFrame.height = windowFrame.height - (SC.MenuPane.VERTICAL_OFFSET * 2);
      } else {
        paneFrame.y += (windowFrame.height - (paneFrame.height + paneFrame.y + 35));
      }
    }

    return paneFrame;
  },

  /** @private
    Reposition the pane in a way that is optimized for menus that have a
    point element.

    This simply calls fitPositionToScreenPointer, then ensures that the menu
    does not exceed the height of the viewport.

    @returns {Rect}
  */
  fitPositionToScreenMenuPointer: function (w, f, a) {
    f = this.fitPositionToScreenPointer(w, f, a);

    // If the height of the menu is bigger than the window height, resize it.
    if (f.height + f.y + 35 >= w.height) {
      f.height = w.height - f.y - (SC.MenuPane.VERTICAL_OFFSET * 2);
    }

    return f;
  },

  /** @private
    re-position rule for triangle pointer picker.
  */
  fitPositionToScreenPointer: function (w, f, a) {
    var curType,
        deltas,
        matrix = this.preferMatrix,
        offset = this.pointerOffset,
        topLefts, botRights,
        windowPadding = this.get('windowPadding');

    // Determine the top-left corner of each of the 4 perfectly positioned
    // frames, while taking the pointer offset into account.
    topLefts = [
      // Top left [x, y] if positioned evenly to the right of the anchor
      [a.x + a.width + offset[0], a.y + a.halfHeight - f.halfHeight],

      // Top left [x, y] if positioned evenly to the left of the anchor
      [a.x - f.width + offset[1], a.y + a.halfHeight - f.halfHeight],

      // Top left [x, y] if positioned evenly above the anchor
      [a.x + a.halfWidth - f.halfWidth, a.y - f.height + offset[2]],

      // Top left [x, y] if positioned evenly below the anchor
      [a.x + a.halfWidth - f.halfWidth, a.y + a.height + offset[3]]
    ];

    // Determine the bottom-right corner of each of the 4 perfectly positioned
    // frames, while taking the pointer offset into account.
    botRights = [
      // Bottom right [x, y] if positioned evenly to the right of the anchor
      [a.x + a.width + f.width + offset[0], a.y + a.halfHeight + f.halfHeight],

      // Bottom right [x, y] if positioned evenly to the left of the anchor
      [a.x + offset[1], a.y + a.halfHeight + f.halfHeight],

      // Bottom right [x, y] if positioned evenly above the anchor
      [a.x + a.halfWidth + f.halfWidth, a.y + offset[2]],

      // Bottom right [x, y] if positioned evenly below the anchor
      [a.x + a.halfWidth + f.halfWidth, a.y + a.height + f.height + offset[3]]
    ];

    // Loop through the preferred matrix, hopefully finding one that will fit
    // perfectly.
    for (var i = 0, pointerLen = SC.POINTER_LAYOUT.length; i < pointerLen; i++) {
      // The current preferred side.
      curType = matrix[i];

      // Determine if any of the sides of the pane would go beyond the window's
      // edge for each of the 4 perfectly positioned frames; taking the amount
      // of windowPadding into account.  This is done by measuring the distance
      // from each side of the frame to the side of the window.  If the distance
      // is negative then the edge is overlapping.
      //
      // If a perfect position has no overlapping edges, then it is a viable
      // option for positioning.
      deltas = {
        top: topLefts[curType][1] - windowPadding,
        right: w.width - windowPadding - botRights[curType][0],
        bottom: w.height - windowPadding - botRights[curType][1],
        left: topLefts[curType][0] - windowPadding
      };

      // UNUSED.  It would be nice to get the picker as close as possible.
      // Cache the fallback deltas.
      // if (curType === matrix[4]) {
      //   fallbackDeltas = deltas;
      // }

      // If no edges overflow, then use this layout.
      if (deltas.top >= 0 &&
          deltas.right >= 0 &&
          deltas.bottom >= 0 &&
          deltas.left >= 0) {

        f.x = topLefts[curType][0];
        f.y = topLefts[curType][1];

        this.set('pointerPosX', 0);
        this.set('pointerPosY', 0);
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);

        break;

      // If we prefer right or left and can fit right or left respectively, but
      // can't fit the top within the window top and padding, then check if by
      // adjusting the top of the pane down if it would still be beside the
      // anchor and still above the bottom of the window with padding.
      } else if (((curType === 0 && deltas.right >= 0) || // Right fits for preferred right
                 (curType === 1 &&  deltas.left >= 0)) && // or left fits for preferred left,
                 deltas.top < 0 && // but top doesn't fit,
                 deltas.top + f.halfHeight >= 0) {  // yet it could.

        // Adjust the pane position by the amount of downward shifting.
        f.x = topLefts[curType][0];
        f.y = topLefts[curType][1] - deltas.top;

        // Offset the pointer position by the opposite amount of downward
        // shifting (minus half the height of the pointer).
        this.set('pointerPosX', 0);
        this.set('pointerPosY', deltas.top);
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);
        break;

      // If we prefer right or left and can fit right or left respectively, but
      // can't fit the bottom within the window bottom and padding, then check
      // if by adjusting the top of the pane up if it would still be beside the
      // anchor and still below the top of the window with padding.
      } else if (((curType === 0 && deltas.right >= 0) || // Right fits for preferred right
                 (curType === 1 &&  deltas.left >= 0)) && // or left fits for preferred left,
                 deltas.bottom < 0 && // but bottom doesn't fit,
                 deltas.bottom + f.halfHeight >= 0) {  // yet it could.

        // Adjust the pane position by the amount of upward shifting.
        f.x = topLefts[curType][0];
        f.y = topLefts[curType][1] + deltas.bottom;

        // Offset the pointer position by the opposite amount of upward
        // shifting (minus half the height of the pointer).
        this.set('pointerPosX', 0);
        this.set('pointerPosY', Math.abs(deltas.bottom));
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);
        break;

      // If we prefer top or bottom and can fit top or bottom respectively, but
      // can't fit the right side within the window right side plus padding,
      // then check if by adjusting the pane leftwards to fit if it would still
      // be beside the anchor and still fit within the left side of the window
      // with padding.
      } else if (((curType === 2 && deltas.top >= 0) || // Top fits for preferred top
                 (curType === 3 &&  deltas.bottom >= 0)) && // or bottom fits for preferred bottom,
                 deltas.right < 0 && // but right doesn't fit,
                 deltas.right + f.halfWidth >= 0) {  // yet it could.

        // Adjust the pane position by the amount of leftward shifting.
        f.x = topLefts[curType][0] + deltas.right;
        f.y = topLefts[curType][1];

        // Offset the pointer position by the opposite amount of leftward
        // shifting (minus half the width of the pointer).
        this.set('pointerPosX', Math.abs(deltas.right));
        this.set('pointerPosY', 0);
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);
        break;

      // If we prefer top or bottom and can fit top or bottom respectively, but
      // can't fit the left side within the window left side plus padding,
      // then check if by adjusting the pane rightwards to fit if it would still
      // be beside the anchor and still fit within the right side of the window
      // with padding.
      } else if (((curType === 2 && deltas.top >= 0) || // Top fits for preferred top
                 (curType === 3 &&  deltas.bottom >= 0)) && // or bottom fits for preferred bottom,
                 deltas.left < 0 && // but left doesn't fit,
                 deltas.left + f.halfWidth >= 0) {  // yet it could.

        // Adjust the pane position by the amount of leftward shifting.
        f.x = topLefts[curType][0] - deltas.left;
        f.y = topLefts[curType][1];

        // Offset the pointer position by the opposite amount of leftward
        // shifting (minus half the width of the pointer).
        this.set('pointerPosX', deltas.left);
        this.set('pointerPosY', 0);
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);
        break;
      }

    }

    // If no arrangement was found to fit, then use the fall back preferred
    // type.
    if (i === pointerLen) {
      if (matrix[4] === -1) {
        //f.x = a.x > 0 ? a.x + 23 : 0; // another alternative align to left
        f.x = a.x + a.halfWidth;
        f.y = a.y + a.halfHeight - f.halfHeight;

        this.set('pointerPos', SC.POINTER_LAYOUT[0] + ' fallback');
        this.set('pointerPosY', f.halfHeight - 40);
      } else {
        f.x = topLefts[matrix[4]][0];
        f.y = topLefts[matrix[4]][1];

        this.set('pointerPos', SC.POINTER_LAYOUT[matrix[4]]);
        this.set('pointerPosY', 0);
      }

      this.set('pointerPosX', 0);
    }

    this.invokeLast(this._adjustPointerPosition);

    return f;
  },

  /** @private Measure the pointer element and adjust it by the determined offset. */
  _adjustPointerPosition: function () {
    var pointer = this.$('.sc-pointer'),
      pointerPos = this.get('pointerPos'),
      marginLeft,
      marginTop;

    switch (pointerPos) {
    case 'perfectRight':
    case 'perfectLeft':
      marginTop = -Math.round(pointer.outerHeight() / 2);
      marginTop += this.get('pointerPosY');
      pointer.attr('style', "margin-top: " + marginTop + "px");
      break;
    case 'perfectTop':
    case 'perfectBottom':
      marginLeft = -Math.round(pointer.outerWidth() / 2);
      marginLeft += this.get('pointerPosX');
      pointer.attr('style', "margin-left: " + marginLeft + "px;");
      break;
    }
  },

  /** @private
    This method will set up pointerOffset and preferMatrix according to type
    and size if not provided explicitly.
  */
  setupPointer: function (a) {
    var pointerOffset = this.pointerOffset,
        K             = SC.PickerPane;

    // set up pointerOffset according to type and size if not provided explicitly
    if (!pointerOffset || pointerOffset.length !== 4) {
      if (this.get('preferType') == SC.PICKER_MENU_POINTER) {
        switch (this.get('controlSize')) {
        case SC.TINY_CONTROL_SIZE:
          this.set('pointerOffset', K.TINY_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.TINY_MENU_WINDOW_PADDING);
          break;
        case SC.SMALL_CONTROL_SIZE:
          this.set('pointerOffset', K.SMALL_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.SMALL_MENU_WINDOW_PADDING);
          break;
        case SC.REGULAR_CONTROL_SIZE:
          this.set('pointerOffset', K.REGULAR_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.REGULAR_MENU_WINDOW_PADDING);
          break;
        case SC.LARGE_CONTROL_SIZE:
          this.set('pointerOffset', K.LARGE_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.LARGE_MENU_WINDOW_PADDING);
          break;
        case SC.HUGE_CONTROL_SIZE:
          this.set('pointerOffset', K.HUGE_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.HUGE_MENU_WINDOW_PADDING);
          break;
        default:
          this.set('pointerOffset', K.REGULAR_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.REGULAR_MENU_WINDOW_PADDING);
          //@if(debug)
          SC.warn('SC.PickerPane with preferType of SC.PICKER_MENU_POINTER should either define a controlSize or provide a pointerOffset. SC.PickerPane will fall back to default pointerOffset of SC.PickerPane.REGULAR_PICKER_MENU_POINTER_OFFSET and default windowPadding of SC.PickerPane.WINDOW_PADDING');
          //@endif
        }
      } else {
        var overlapTuningX = (a.width < 16)  ? ((a.width < 4)  ? 9 : 6) : 0,
            overlapTuningY = (a.height < 16) ? ((a.height < 4) ? 9 : 6) : 0,
            offsetKey      = K.PICKER_POINTER_OFFSET;

        var offset = [offsetKey[0] + overlapTuningX,
                      offsetKey[1] - overlapTuningX,
                      offsetKey[2] - overlapTuningY,
                      offsetKey[3] + overlapTuningY];

        this.set('pointerOffset', offset);
        // TODO: What to do about this?
        if (SC.none(this.get('windowPadding'))) {
          this.set('windowPadding', K.WINDOW_PADDING);
        }
      }
    } else {
      // TODO: What to do about this?
      if (SC.none(this.get('windowPadding'))) {
        this.set('windowPadding', K.WINDOW_PADDING);
      }
    }

    // set up preferMatrix according to type if not provided explicitly:
    // take default [0, 1, 2, 3, 2] for picker, [3, 0, 1, 2, 3] for menu picker if
    // custom matrix not provided explicitly
    if (!this.preferMatrix || this.preferMatrix.length !== 5) {
      // menu-picker default re-position rule :
      // perfect bottom (3) > perfect right (0) > perfect left (1) > perfect top (2)
      // fallback to perfect bottom (3)
      // picker default re-position rule :
      // perfect right (0) > perfect left (1) > perfect top (2) > perfect bottom (3)
      // fallback to perfect top (2)
      this.set('preferMatrix', this.get('preferType') === SC.PICKER_MENU_POINTER ? [3, 2, 1, 0, 3] : [0, 1, 2, 3, 2]);
    }
  },

  /**
    @type Array
    @default ['pointerPos']
    @see SC.View#displayProperties
  */
  displayProperties: ['pointerPos'],

  /**
    @type String
    @default 'pickerRenderDelegate'
  */
  renderDelegateName: 'pickerRenderDelegate',

  /** @private - click away picker. */
  modalPaneDidClick: function (evt) {
    var f = this.get('frame'),
        target = this.get('removeTarget') || null,
        action = this.get('removeAction'),
        rootResponder = this.get('rootResponder');

    if (!this.clickInside(f, evt)) {
      // We're not in the Pane so we must be in the modal
      if (action) {
        rootResponder.sendAction(action, target, this, this, null, this);
      } else {
        this.remove();
      }

      return YES;
    }

    return NO;
  },

  /** @private */
  mouseDown: function (evt) {
    return this.modalPaneDidClick(evt);
  },

  /** @private
    internal method to define the range for clicking inside so the picker
    won't be clicked away default is the range of contentView frame.
    Over-write for adjustments. ex: shadow
  */
  clickInside: function (frame, evt) {
    return SC.pointInRect({ x: evt.pageX, y: evt.pageY }, frame);
  },

  /**
    Invoked by the root responder. Re-position picker whenever the window resizes.
  */
  windowSizeDidChange: function (oldSize, newSize) {
    sc_super();

    if (this.repositionOnWindowResize) { this.positionPane(); }
  },

  remove: function () {
    if (this.get('isVisibleInWindow') && this.get('isPaneAttached')) {
      this._withdrawOverflowRequest();
    }
    this._removeScrollObservers();

    // Stop observing the frame for changes.
    this.removeObserver('borderFrame', this.borderFrameDidChange);

    return sc_super();
  },

  /** @private
    Internal method to hide the overflow on the body to make sure we don't
    show scrollbars when the picker has shadows, as it's really annoying.
  */
  _hideOverflow: function () {
    var main = SC.$('.sc-main'),
        minWidth = parseInt(main.css('minWidth'), 0),
        minHeight = parseInt(main.css('minHeight'), 0),
        windowSize = SC.RootResponder.responder.get('currentWindowSize');

    if (windowSize.width >= minWidth && windowSize.height >= minHeight) {
      SC.bodyOverflowArbitrator.requestHidden(this);
    }
  },

  /** @private
    Internal method to show the overflow on the body to make sure we don't
    show scrollbars when the picker has shadows, as it's really annoying.
  */
  _withdrawOverflowRequest: function () {
    SC.bodyOverflowArbitrator.withdrawRequest(this);
  },

  /** @private
    Detect if view is inside a scroll view. Do this by traversing parent view
    hierarchy until you hit a scroll view or main pane.
  */
  _getScrollViewOfView: function (view) {
    var curLevel = view;
    while (curLevel) {
      if (curLevel.isScrollable) {
        break;
      }

      curLevel = curLevel.get('parentView');
    }

    return curLevel;
  },

  /** @private
    If anchor view is in a scroll view, setup observers on scroll offsets.
  */
  _setupScrollObservers: function (anchorView) {
    var scrollView = this._getScrollViewOfView(anchorView);
    if (scrollView) {
      scrollView.addObserver('horizontalScrollOffset', this, this._scrollOffsetDidChange);
      scrollView.addObserver('verticalScrollOffset', this, this._scrollOffsetDidChange);
      this._scrollView = scrollView;
    }
  },

  /** @private
    Teardown observers setup in _setupScrollObservers.
  */
  _removeScrollObservers: function () {
    var scrollView = this._scrollView;
    if (scrollView) {
      scrollView.removeObserver('horizontalScrollOffset', this, this._scrollOffsetDidChange);
      scrollView.removeObserver('verticalScrollOffset', this, this._scrollOffsetDidChange);
    }
  },

  /** @private
    Reposition pane whenever scroll offsets change.
  */
  _scrollOffsetDidChange: function () {
    this.positionPane();
  },

  /** @private Cleanup. */
  destroy: function() {
    this._scrollView = null;
    this._anchorView = null;
    this._anchorHTMLElement = null;
    return sc_super();
  }
});

/**
  Default metrics for the different control sizes.
*/

/** @static */
SC.PickerPane.WINDOW_PADDING = 20;

/** @static */
SC.PickerPane.TINY_MENU_WINDOW_PADDING = 12;

/** @static */
SC.PickerPane.SMALL_MENU_WINDOW_PADDING = 11;

/** @static */
SC.PickerPane.REGULAR_MENU_WINDOW_PADDING = 12;

/** @static */
SC.PickerPane.LARGE_MENU_WINDOW_PADDING = 17;

/** @static */
SC.PickerPane.HUGE_MENU_WINDOW_PADDING = 12;

/** @deprecated Version 1.10.  Use SC.PickerPane.WINDOW_PADDING.
  @static
*/
SC.PickerPane.PICKER_EXTRA_RIGHT_OFFSET = 20;

/** @deprecated Version 1.10.  Use SC.PickerPane.TINY_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.TINY_PICKER_MENU_EXTRA_RIGHT_OFFSET = 12;

/** @deprecated Version 1.10.  Use SC.PickerPane.SMALL_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.SMALL_PICKER_MENU_EXTRA_RIGHT_OFFSET = 11;

/** @deprecated Version 1.10.  Use SC.PickerPane.REGULAR_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.REGULAR_PICKER_MENU_EXTRA_RIGHT_OFFSET = 12;

/** @deprecated Version 1.10.  Use SC.PickerPane.LARGE_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.LARGE_PICKER_MENU_EXTRA_RIGHT_OFFSET = 17;

/** @deprecated Version 1.10.  Use SC.PickerPane.HUGE_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.HUGE_PICKER_MENU_EXTRA_RIGHT_OFFSET = 12;

/**
  @static
*/
SC.PickerPane.PICKER_POINTER_OFFSET = [9, -9, -18, 18];

/**
  @static
*/
SC.PickerPane.TINY_PICKER_MENU_POINTER_OFFSET = [9, -9, -18, 18];

/**
  @static
*/
SC.PickerPane.SMALL_PICKER_MENU_POINTER_OFFSET = [9, -9, -8, 8];

/**
  @static
*/
SC.PickerPane.REGULAR_PICKER_MENU_POINTER_OFFSET = [9, -9, -12, 12];

/**
  @static
*/
SC.PickerPane.LARGE_PICKER_MENU_POINTER_OFFSET = [9, -9, -16, 16];

/**
  @static
*/
SC.PickerPane.HUGE_PICKER_MENU_POINTER_OFFSET = [9, -9, -18, 18];
