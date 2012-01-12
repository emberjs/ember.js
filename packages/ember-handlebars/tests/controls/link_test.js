// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = Ember.get, set = Ember.set, link, application;

module('Ember.Link', {
  setup: function() {
    application = Ember.Application.create();
    link = Ember.Link.create();
    append();
  },
  teardown: function() {
    link.destroy();
    application.destroy();
  }
});

function append() {
  Ember.run(function() {
    link.appendTo('#qunit-fixture');
  });
}

test('should trigger an action when clicked', function() {
  var wasClicked;

  var actionObject = Ember.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  link.set('target', actionObject);
  link.set('action', 'myAction');

  link.$().trigger('click');
  ok(wasClicked, 'invokes action');
});