// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/panel');
sc_require('views/button');

/**
  Passed to delegate when alert pane is dismissed by pressing button 1

  @static
  @type String
  @default 'button1'
*/
SC.BUTTON1_STATUS = 'button1';

/**
  Passed to delegate when alert pane is dismissed by pressing button 2

  @static
  @type String
  @default 'button2'
*/
SC.BUTTON2_STATUS = 'button2';

/**
  Passed to delegate when alert pane is dismissed by pressing button 3

  @static
  @type String
  @default 'button3'
*/
SC.BUTTON3_STATUS = 'button3';

/** @class
  Displays a preformatted modal alert pane.

  Alert panes are a simple way to provide modal messaging that otherwise
  blocks the user's interaction with your application.  Alert panes are
  useful for showing important error messages and confirmation dialogs. They
  provide a better user experience than using the OS-level alert dialogs.

  ## Displaying an Alert Pane

  The easiest way to display an alert pane is to use one of the various
  class methods defined on `SC.AlertPane`, passing the message and an optional
  detailed description and caption.

  There are four variations of this method can you can invoke:

   - `warn()` -- displays an alert pane with a warning icon to the left.
   - `error()` -- displays an alert with an error icon to the left
   - `info()` -- displays an alert with an info icon to the left
   - `plain()` -- displays an alert w/o any icon
   - `show()` -- displays an alert with a customizable icon to the left

  In addition to passing a message, description and caption, you can also customize
  the title of the button 1 (OK) and add an optional button 2 and 3 (Cancel or Extra).

   - button1 -- 1st button from the right. default:OK
   - button2 -- 2nd button from the right. Optional. Could be Cancel or 2nd action.
   - button3 -- 1st button from the left. Optional. Could be Cancel or alternative option.

  Additionally, you can define a delegate object.  This delegate's
  `alertPaneDidDismiss()` method will be called when the pane
  is dismissed, passing the pane instance and a key indicating which
  button was pressed.

  ## Examples

  Show a simple AlertPane with an OK button:

      SC.AlertPane.warn({
        message: "Could not load calendar",
        description: "Your internet connection may be unavailable or our servers may be down.",
        caption: "Try again in a few minutes."
      });

  Show an AlertPane with a customized OK title (title will be 'Try Again') and
  custom action:

      SC.AlertPane.warn({
        message: "Could not load calendar",
        description: "Your internet connection may be unavailable or our servers may be down.",
        caption: "Try again in a few minutes.",
        buttons: [
          { title: "Try Again" }
        ]
      });

  Show an AlertPane with a custom OK, a Cancel button and an Extra button,
  each with custom titles.  Also, pass a delegate that will be invoked when
  the user's dismisses the dialog.

      MyApp.calendarController = SC.Object.create({
        alertPaneDidDismiss: function(pane, status) {
          switch(status) {
            case SC.BUTTON1_STATUS:
              this.tryAgain();
              break;

            case SC.BUTTON2_STATUS:
              // do nothing
              break;

            case SC.BUTTON3_STATUS:
              this.showMoreInfo();
              break;
          }
        },
        ...
      });


      SC.AlertPane.warn({
        message: "Could not load calendar",
        description: "Your internet connection may be unavailable or our servers may be down.",
        caption: "Try again in a few minutes.",
        delegate: MyApp.calendarController,
        buttons: [
          { title: "Try Again" },
          { title: "Cancel" },
          { title: "More Info…" }
        ]
      });

  Instead of using the delegate pattern above, you can also specify a target
  and an action, similar to SC.ButtonView.

      SC.AlertPane.warn({
        message: "Could not load calendar",
        description: "Your internet connection may be unavailable or our servers may be down.",
        caption: "Try again in a few minutes.",
        buttons: [
          {
            title: "OK",
            action: "didClickOK",
            target: MyApp.calendarController
          }
        ]
      });

  Also note that in addition to passing the action as a string of the method
  name that will be invoked, you can also give a function reference as the
  action.


  @extends SC.PanelPane
  @since SproutCore 1.0
*/
SC.AlertPane = SC.PanelPane.extend(
/** @scope SC.AlertPane.prototype */{

  /**
    @type Array
    @default ['sc-alert']
    @see SC.View#classNames
  */
  classNames: ['sc-alert'],

  /**
    The WAI-ARIA role for alert pane.

    @type String
    @default 'alertdialog'
    @constant
  */
  ariaRole: 'alertdialog',

  /**
    If defined, the delegate is notified when the pane is dismissed. If you have
    set specific button actions, they will be called on the delegate object

    The method to be called on your delegate will be:

        alertPaneDidDismiss: function(pane, status) {}

    The status will be one of `SC.BUTTON1_STATUS`, `SC.BUTTON2_STATUS` or `SC.BUTTON3_STATUS`
    depending on which button was clicked.

    @type Object
    @default null
  */
  delegate: null,

  /**
    The icon URL or class name. If you do not set this, an alert icon will
    be shown instead.

    @type String
    @default 'sc-icon-alert-48'
  */
  icon: 'sc-icon-alert-48',

  /**
    The primary message to display. This message will appear in large bold
    type at the top of the alert.

    @type String
    @default ""
  */
  message: "",

  /**
    The ARIA label for the alert is the message, by default.

    @field {String}
  */
  ariaLabel: function() {
    return this.get('message');
  }.property('message').cacheable(),

  /**
    An optional detailed description. Use this string to provide further
    explanation of the condition and, optionally, ways the user can resolve
    the problem.

    @type String
    @default ""
  */
  description: "",

  /**
    An escaped and formatted version of the description property.

    @field
    @type String
    @observes description
  */
  displayDescription: function() {
    var desc = this.get('description');
    if (!desc || desc.length === 0) return desc ;

    desc = SC.RenderContext.escapeHTML(desc); // remove HTML
    return '<p class="description">' + desc.split('\n').join('</p><p class="description">') + '</p>';
  }.property('description').cacheable(),

  /**
    An optional detailed caption. Use this string to provide further
    fine print explanation of the condition and, optionally, ways the user can resolve
    the problem.

    @type String
    @default ""
  */
  caption: "",

  /**
    An escaped and formatted version of the caption property.

    @field
    @type String
    @observes caption
  */
  displayCaption: function() {
    var caption = this.get('caption');
    if (!caption || caption.length === 0) return caption ;

    caption = SC.RenderContext.escapeHTML(caption); // remove HTML
    return '<p class="caption">' + caption.split('\n').join('</p><p class="caption">') + '</p>';
  }.property('caption').cacheable(),

  /**
    The button view for button 1 (OK).

    @type SC.ButtonView
  */
  button1: SC.outlet('contentView.childViews.1.childViews.1'),

  /**
    The button view for the button 2 (Cancel).

    @type SC.ButtonView
  */
  button2: SC.outlet('contentView.childViews.1.childViews.0'),

  /**
    The button view for the button 3 (Extra).

    @type SC.ButtonView
  */
  button3: SC.outlet('contentView.childViews.2.childViews.0'),

  /**
    The view for the button 3 (Extra) wrapper.

    @type SC.View
  */
  buttonThreeWrapper: SC.outlet('contentView.childViews.2'),

  /**
    @type Hash
    @default { top : 0.3, centerX: 0, width: 500 }
    @see SC.View#layout
  */
  layout: { top : 0.3, centerX: 0, width: 500 },

  /** @private - internal view that is actually displayed */
  contentView: SC.View.extend({

    useStaticLayout: YES,

    layout: { left: 0, right: 0, top: 0, height: "auto" },

    childViews: [
      SC.View.extend({
        classNames: ['info'],
        useStaticLayout: YES,

        /** @private */
        render: function(context, firstTime) {
          var pane = this.get('pane');
          if(pane.get('icon') == 'blank') context.addClass('plain');
          context.push('<img src="'+SC.BLANK_IMAGE_URL+'" class="icon '+pane.get('icon')+'" />');
          context.begin('h1').addClass('header').text(pane.get('message') || '').end();
          context.push(pane.get('displayDescription') || '');
          context.push(pane.get('displayCaption') || '');
          context.push('<div class="separator"></div>');

        }
      }),

      SC.View.extend({
        layout: { bottom: 13, height: 24, right: 18, width: 466 },
        childViews: ['cancelButton', 'okButton'],
        classNames: ['text-align-right'],

        cancelButton: SC.ButtonView.extend({
          useStaticLayout: YES,
          actionKey: SC.BUTTON2_STATUS,
          localize: YES,
          layout: { right: 5, height: 'auto', width: 'auto', bottom: 0 },
          isCancel: YES,
          action: "dismiss",
          isVisible: NO
        }),

        okButton: SC.ButtonView.extend({
          useStaticLayout: YES,
          actionKey: SC.BUTTON1_STATUS,
          localize: YES,
          layout: { left: 0, height: 'auto', width: 'auto', bottom: 0 },
          isDefault: YES,
          action: "dismiss",
          isVisible: NO
        })
      }),

      SC.View.extend({
        layout: { bottom: 13, height: 24, left: 18, width: 150 },
        childViews: [
          SC.ButtonView.extend({
            useStaticLayout: YES,
            actionKey: SC.BUTTON3_STATUS,
            localize: YES,
            layout: { left: 0, height: 'auto', width: 'auto', bottom: 0 },
            action: "dismiss",
            isVisible: NO
          })]
      })]
  }),

  /**
    Action triggered whenever any button is pressed. Also the hides the
    alertpane itself.

    This will trigger the following chain of events:

     1. If a delegate was given, and it has alertPaneDidDismiss it will be called
     2. Otherwise it will look for the action of the button and call:
      a) The action function reference if one was given
      b) The action method on the target if one was given
      c) If both a and b are missing, call the action on the rootResponder

    @param {SC.View} sender - the button view that was clicked
  */
  dismiss: function(sender) {
    var del = this.delegate,
        rootResponder, action, target;

    if (del && del.alertPaneDidDismiss) {
      del.alertPaneDidDismiss(this, sender.get('actionKey'));
    }

    if (action = (sender && sender.get('customAction'))) {
      if (SC.typeOf(action) === SC.T_FUNCTION) {
        action.call(action);
      } else {
        rootResponder = this.getPath('pane.rootResponder');
        if(rootResponder) {
          target = sender.get('customTarget');
          rootResponder.sendAction(action, target || del, this, this, null, this);
        }
      }
    }

    this.remove(); // hide alert
  },

  /** @private
    Executes whenever one of the icon, message, description or caption is changed.
    This simply causes the UI to refresh.
  */
  alertInfoDidChange: function() {
    var v = this.getPath('contentView.childViews.0');
    if (v) v.displayDidChange(); // re-render message
  }.observes('icon', 'message', 'displayDescription', 'displayCaption')

});

SC.AlertPane.mixin(
/** @scope SC.AlertPane */{

  /**
    Show a dialog with a given set of hash attributes:

        SC.AlertPane.show({
          message: "Could not load calendar",
          description: "Your internet connection may be unavailable or our servers may be down.",
          caption: "Try again in a few minutes.",
          delegate: MyApp.calendarController
        });

    See more examples for how to configure buttons and individual actions in the
    documentation for the `SC.AlertPane` class.

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  show: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    var pane = this.create(args),
        idx = 0,
        buttons = args.buttons,
        buttonView, title, action, target, themeName;

    if(buttons) {
      buttons.forEach(function(button) {
        idx++;
        if(!button) return;
        buttonView = pane.get('button%@'.fmt(idx));

        title = button.title;
        action = button.action;
        target = button.target;
        themeName = args.themeName || 'capsule';

        buttonView.set('title'.fmt(idx), title);
        if(action) buttonView.set('customAction'.fmt(idx), action);
        if(target) buttonView.set('customTarget'.fmt(idx), target);
        buttonView.set('isVisible', !!title);
        buttonView.set('themeName', themeName);
      });
    } else {
      // if there are no buttons defined, just add the standard OK button
      buttonView = pane.get('button1');
      buttonView.set('title', "OK");
      buttonView.set('isVisible', YES);
    }

    var show = pane.append(); // make visible.
    pane.adjust('height', pane.childViews[0].$().height());
    pane.updateLayout();
    return show;
  },

  /**
    Same as `show()` just that it uses sc-icon-alert-48 CSS classname
    as the dialog icon

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  warn: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    args.icon = 'sc-icon-alert-48';
    return this.show(args);
  },

  /**
    Same as `show()` just that it uses sc-icon-info-48 CSS classname
    as the dialog icon

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  info: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    args.icon = 'sc-icon-info-48';
    return this.show(args);
  },

  /**
    Same as `show()` just that it uses sc-icon-error-48 CSS classname
    as the dialog icon

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  error: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    args.icon = 'sc-icon-error-48';
    return this.show(args);
  },

  /**
    Same as `show()` just that it uses blank CSS classname
    as the dialog icon

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  plain: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    args.icon = 'blank';
    return this.show(args);
  },

  /** @private
    Set properties to new structure for call that use the old arguments
    structure.

    Deprecated API but is preserved for now for backwards compatibility.

    @deprecated
  */
  _argumentsCall: function(args) {
    var ret = args;
    if(SC.typeOf(args)!==SC.T_HASH) {
      //@if(debug)
      SC.debug('SC.AlertPane has changed the signatures for show(), info(), warn(), error() and plain(). Please update accordingly.');
      //@endif
      var normalizedArgs = this._normalizeArguments(arguments);

      // now convert it to the new format for show()
      ret = {
        message: normalizedArgs[0],
        description: normalizedArgs[1],
        caption: normalizedArgs[2],
        delegate: normalizedArgs[7],
        icon: (normalizedArgs[6] || 'sc-icon-alert-48'),
        themeName: 'capsule'
      };

      // set buttons if there are any (and check if it's a string, since last
      // argument could be the delegate object)
      if(SC.typeOf(normalizedArgs[3])===SC.T_STRING || SC.typeOf(normalizedArgs[4])===SC.T_STRING || SC.typeOf(normalizedArgs[5])===SC.T_STRING) {
        ret.buttons = [
          { title: normalizedArgs[3] },
          { title: normalizedArgs[4] },
          { title: normalizedArgs[5] }
        ];
      }

    }
    return ret;
  },

  /** @private
    internal method normalizes arguments for processing by helper methods.
  */
  _normalizeArguments: function(args) {
    args = SC.A(args); // convert to real array
    var len = args.length, delegate = args[len-1];
    if (SC.typeOf(delegate) !== SC.T_STRING) {
      args[len-1] = null;
    } else delegate = null ;
    args[7] = delegate ;
    return args ;
  }

});
