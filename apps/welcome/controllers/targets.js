// ==========================================================================
// Project:   Welcome.targetsController
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*global CoreTools Welcome */

/**

  Manages the list of targets

  @extends SC.ArrayController
*/
Welcome.targetsController = SC.ArrayController.create(
/** @scope Welcome.targetsController.prototype */ {

  /**
    Call this method whenever you want to reload the targets from the server.
  */
  reload: function () {
    var targets = Welcome.store.find(CoreTools.TARGETS_QUERY);
    this.set('content', targets);
  },

  appsOnly: function () {
    return this.filter(function (t) {
      return t.get('kind') === 'app' && !t.get('name').match(/sproutcore\/(welcome|experimental)/);
    }).sortProperty('sortKind', 'displayName');
  }.property('[]').cacheable(),

  loadApplication: function () {
    var app = this.get('selection').firstObject(),
        url = app ? app.get('appUrl') : null;

    if (url) {
      this.set('canLoadApp', NO);
      this.invokeLater(function () {
        window.location.href = url; // load new app
      });
    }
  },

  launchEnabled: function () {
    var canLoadApp = this.get('canLoadApp'),
        selection = this.get('selection'),
        selectedObject = selection.firstObject();
    return canLoadApp && selectedObject && selectedObject.get('name') !== '/sproutcore';
  }.property('canLoadApp', 'selection').cacheable(),

  // used to disable all controls
  canLoadApp: YES,

  allowsEmptySelection: NO,
  allowsMultipleSelection: NO

});
