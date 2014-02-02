// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  If an exception is thrown during execution of your SproutCore app, this
  object will be given the opportunity to handle it.

  By default, a simple error message is displayed prompting the user to
  reload. You could override the handleException method to, for example, send
  an XHR to your servers so you can collect information about crashes in your
  application.

  Since the application is in an unknown state when an exception is thrown, we
  rely on JavaScript and DOM manipulation to generate the error instead of
  using SproutCore views.

  @since SproutCore 1.5
*/
SC.ExceptionHandler = {

  /** @private */
  enabled: (SC.buildMode !== 'debug'),

  /**
    Called when an exception is encountered by code executed using SC.run().

    By default, this will display an error dialog to the user. If you
    want more sophisticated behavior, override this method.

    @param {Exception} exception the exception thrown during execution
  */
  handleException: function(exception) {
    if (this.isShowingErrorDialog) return NO;
    
    this._displayErrorDialog(exception);
    
    return NO;
  },

  /** @private
    Creates the error dialog and appends it to the DOM.

    @param {Exception} exception the exception to display
  */
  _displayErrorDialog: function(exception) {
    var html = this._errorDialogHTMLForException(exception),
        node = document.createElement('div');

    node.style.cssText = "left: 0px; right: 0px; top: 0px; bottom: 0px; position: absolute; background-color: white; background-color: rgba(255,255,255,0.6); z-index:100;";
    node.innerHTML = html;

    document.body.appendChild(node);

    this.isShowingErrorDialog = YES;
  },

  /** @private
    Given an exception, returns the HTML for the error dialog.

    @param {Exception} exception the exception to display
    @returns {String}
  */
  _errorDialogHTMLForException: function(exception) {
    var html;

    html = [
'<div id="sc-error-dialog" style="position: absolute; width: 500px; left: 50%; top: 50%; margin-left: -250px; background-color: white; border: 1px solid black; font-family: Monaco, monospace; font-size: 9px; letter-spacing: 1px; padding: 10px">',
  'An error has occurred which prevents the application from running:',
  '<br><br>',
  exception.message,
  '<div id="sc-error-dialog-reload-button" onclick="window.location.reload();" style="float: right; font-family: Monaco, monospace; font-size: 9px; letter-spacing: 1px; border: 1px solid black; padding: 3px; clear: both; margin-top: 20px; cursor: pointer;">',
  'Reload',
  '</div>',
'</div>'
    ];

    return html.join('');
  },

  /**
    YES if an exception was thrown and the error dialog is visible.

    @type Boolean
    @default NO
  */
  isShowingErrorDialog: NO
};