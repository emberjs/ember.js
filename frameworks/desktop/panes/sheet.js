// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/panel');

/**
 @class

   Displays a modal sheet pane that animates from the top of the viewport.

 The default way to use the sheet pane is to simply add it to your page like this:

 SC.SheetPane.create({
        layout: { width: 400, height: 200, centerX: 0 },
        contentView: SC.View.extend({
        })
      }).append();

 This will cause your sheet panel to display.  The default layout for a Sheet
 is to cover the entire document window with a semi-opaque background, and to
 resize with the window.

 @extends SC.PanelPane
 @since SproutCore 1.0
 @author Evin Grano
 @author Tom Dale
 @author Joe Gaudet
 */
SC.SheetPane = SC.PanelPane.extend(
  /** @scope SC.SheetPane.prototype */
  {

    /**
     @type {Array}
     @default {['sc-sheet']}
     @see {SC.View#classNames}
     */
    classNames: ['sc-sheet'],

    /**
     @type SC.View
     @default SC.ModalPane
     */
    modalPane: SC.ModalPane,

    /**
     * Duration in seconds
     * @type {Number}
     */
    duration: 0.3,

    /**
     * Timing Function
     *
     * @type {String}
     */
    timing: 'ease-in-out',

    /** @private */
    transitionIn: SC.View.SLIDE_IN,

    /** @private */
    transitionInOptions: function () {
      return {
        direction: 'down',
        duration: this.get('duration'),
        timing: this.get('timing')
      };
    }.property('timing', 'duration').cacheable(),


    /** @private */
    transitionOut: SC.View.SLIDE_OUT,

    /** @private */
    transitionOutOptions: function () {
      return {
        direction: 'up',
        duration: this.get('duration'),
        timing: this.get('timing')
      };
    }.property('timing', 'duration').cacheable()

  });

