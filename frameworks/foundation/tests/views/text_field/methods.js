// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module, test, htmlbody, ok, equals, same, stop, start, Q$ */


// note: need to test interaction with Validators here
// possibly move Validator support to TextFieldView specifically.

var pane, view, view1, view2;

module("SC.TextFieldView",{
  setup: function() {
      SC.RunLoop.begin();
      pane = SC.MainPane.create({
        childViews: [
          SC.TextFieldView.extend({
            hint:'First Name',
            value:'',
            title:'First Name'
          }),
          SC.TextFieldView.extend({
            hint:'Name',
            value:'SproutCore',
            isEnabled: NO
          }),
          SC.TextFieldView.extend({
            layerId: 'fieldWithCustomId'
          })
        ]
    });
    pane.append(); // make sure there is a layer...
    SC.RunLoop.end();

    view  = pane.childViews[0];
    view1 = pane.childViews[1];
    view2 = pane.childViews[2];
  },

  teardown: function() {
      pane.destroy();
      pane = view = null ;
    }
});

test("renders an text field input tag with appropriate attributes", function() {
  equals(view.get('value'), '', 'value should be empty');
  equals(view1.get('value'), 'SproutCore', 'value should not be empty ');
  equals(view.get('isEnabled'),YES,'field enabled' );
  equals(view1.get('isEnabled'),NO,'field not enabled' );
  var q = Q$('input', view.get('layer'));
  equals(q.attr('type'), 'text', 'should have type as text');
  equals(q.attr('name'), view.get('layerId'), 'should have name as view_layerid');
});

test("renders an text field with a custom layerId with correct id and name html attributes", function() {
  equals(view2.$().attr('id'), 'fieldWithCustomId', 'label html element should have the custom id');
  equals(view2.$input().attr('name'), 'fieldWithCustomId', 'input html element should have the custom name');
});

test("isEnabled=NO should add disabled class", function() {
  SC.RunLoop.begin();
  view.set('isEnabled', NO);
  SC.RunLoop.end();
  ok(view.$().hasClass('disabled'), 'should have disabled class');
});

test("isEnabled=NO isEditable=NO should add disabled attribute", function() {
  SC.RunLoop.begin();
  view.set('isEnabled', NO);
  view.set('isEditable', NO);
  SC.RunLoop.end();
  ok(view.$input().attr('disabled'), 'should have disabled attribute');
  ok(view.$input().attr('readOnly'), 'should have readOnly attribute');
});

test("isEnabled=NO isEditable=YES should add disabled attribute", function() {
  SC.RunLoop.begin();
  view.set('isEnabled', NO);
  view.set('isEditable', YES);
  SC.RunLoop.end();
  ok(view.$input().attr('disabled'), 'should have disabled attribute');
  ok(!view.$input().attr('readOnly'), 'should not have readOnly attribute');
});

test("isEnabled=YES isEditable=NO should add readOnly attribute", function() {
  SC.RunLoop.begin();
  view.set('isEnabled', YES);
  view.set('isEditable', NO);
  SC.RunLoop.end();
  ok(!view.$input().attr('disabled'), 'should not have disabled attribute');
  ok(view.$input().attr('readOnly'), 'should have readOnly attribute');
});

test("isEnabled=YES isEditable=YES should not add disable or readOnly attribute", function() {
  SC.RunLoop.begin();
  view.set('isEnabled', YES);
  view.set('isEditable', YES);
  SC.RunLoop.end();
  ok(!view.$input().attr('disabled'), 'should not have disabled attribute');
  ok(!view.$input().attr('readOnly'), 'should not have readOnly attribute');
});

test("isBrowserFocusable should set tab index", function() {
  SC.RunLoop.begin();
  view.set('isBrowserFocusable', YES);
  SC.RunLoop.end();
  ok(view.$input().attr('tabindex') !== "-1", 'focusable field should not have unfocusable tab index');
  SC.RunLoop.begin();
  view.set('isBrowserFocusable', NO);
  SC.RunLoop.end();
  ok(view.$input().attr('tabindex') === "-1", 'unfocusable field should have unfocusable tab index');
});

test("autoCapitalize=SC.AUTOCAPITALIZE_NONE should add autocapitalize='none'", function() {
  SC.RunLoop.begin();
  view.set('autoCapitalize', SC.AUTOCAPITALIZE_NONE);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocapitalize') === "none", 'should have an autocapitalize attribute set to "none"');
});

test("autoCapitalize=SC.AUTOCAPITALIZE_SENTENCES should add autocapitalize='sentences'", function() {
  SC.RunLoop.begin();
  view.set('autoCapitalize', SC.AUTOCAPITALIZE_SENTENCES);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocapitalize') === "sentences", 'should have an autocapitalize attribute set to "sentences"');
});

test("autoCapitalize=SC.AUTOCAPITALIZE_WORDS should add autocapitalize='words'", function() {
  SC.RunLoop.begin();
  view.set('autoCapitalize', SC.AUTOCAPITALIZE_WORDS);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocapitalize') === "words", 'should have an autocapitalize attribute set to "words"');
});

test("autoCapitalize=SC.AUTOCAPITALIZE_CHARACTERS should add autocapitalize='characters'", function() {
  SC.RunLoop.begin();
  view.set('autoCapitalize', SC.AUTOCAPITALIZE_CHARACTERS);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocapitalize') === "characters", 'should have an autocapitalize attribute set to "characters"');
});

test("autoCapitalize=YES should add autocapitalize='sentences'", function() {
  SC.RunLoop.begin();
  view.set('autoCapitalize', YES);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocapitalize') === "sentences", 'should have an autocapitalize attribute set to "sentences"');
});

test("autoCapitalize=NO should add autocapitalize='none'", function() {
  SC.RunLoop.begin();
  view.set('autoCapitalize', NO);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocapitalize') === "none", 'should have an autocapitalize attribute set to "none"');
});

test("autoCapitalize=null should not add autocapitalize", function() {
  SC.RunLoop.begin();
  view.set('autoCapitalize', null);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(!view.$input().attr('autocapitalize'), 'should not have an autocapitalize attribute set');
});

test("autoCorrect=YES should add autocorrect='on'", function() {
  SC.RunLoop.begin();
  view.set('autoCorrect', YES);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocorrect') === "on", 'should have an autocorrect attribute set to "on"');
});

test("autoCorrect=NO should add autocorrect='off'", function() {
  SC.RunLoop.begin();
  view.set('autoCorrect', NO);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocorrect') === "off", 'should have an autocorrect attribute set to "off"');
});

test("autoCorrect=null should not add autocorrect", function() {
  SC.RunLoop.begin();
  view.set('autoCorrect', null);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(!view.$input().attr('autocorrect'), 'should not have an autocorrect attribute set');
});

test("autoComplete=YES should add autocomplete='on'", function() {
  SC.RunLoop.begin();
  view.set('autoComplete', YES);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocomplete') === "on", 'should have an autocomplete attribute set to "on"');
});

test("autoComplete=NO should add autocomplete='off'", function() {
  SC.RunLoop.begin();
  view.set('autoComplete', NO);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(view.$input().attr('autocomplete') === "off", 'should have an autocomplete attribute set to "off"');
});

test("autoComplete=null should not add autocomplete", function() {
  SC.RunLoop.begin();
  view.set('autoComplete', null);
  view.displayDidChange();
  SC.RunLoop.end();
  ok(!view.$input().attr('autocomplete'), 'should not have an autocomplete attribute set');
});

/**
 SC.TextFieldView was extended to make use of interpretKeyEvents, which
 allows easy actions to be implemented based off of several key "keys".  This
 test checks that the expected actions are being captured.
 */
test("interpretKeyEvents should allow key command methods to be implemented.", function() {
  var evt,
    layer,
    cancelFlag = NO,
    deleteBackwardFlag = NO,
    deleteForwardFlag = NO,
    insertNewlineFlag = NO,
    insertTabFlag = NO,
    insertBacktabFlag = NO,
    moveLeftFlag = NO,
    moveRightFlag = NO,
    moveUpFlag = NO,
    moveDownFlag = NO,
    moveToBeginningOfDocumentFlag = NO,
    moveToEndOfDocumentFlag = NO,
    pageDownFlag = NO,
    pageUpFlag = NO;

  view1.cancel = function() { cancelFlag = YES; return YES; };
  view1.deleteBackward = function() { deleteBackwardFlag = YES; return YES; };
  view1.deleteForward = function() { deleteForwardFlag = YES; return YES; };
  view1.insertNewline = function() { insertNewlineFlag = YES; return YES; };
  view1.insertTab = function() { insertTabFlag = YES; return YES; };
  view1.insertBacktab = function() { insertBacktabFlag = YES; return YES; };
  view1.moveLeft = function() { moveLeftFlag = YES; return YES; };
  view1.moveRight = function() { moveRightFlag = YES; return YES; };
  view1.moveUp = function() { moveUpFlag = YES; return YES; };
  view1.moveDown = function() { moveDownFlag = YES; return YES; };
  view1.moveToBeginningOfDocument = function() { moveToBeginningOfDocumentFlag = YES; return YES; };
  view1.moveToEndOfDocument = function() { moveToEndOfDocumentFlag = YES; return YES; };
  view1.pageUp = function() { pageUpFlag = YES; return YES; };
  view1.pageDown = function() { pageDownFlag = YES; return YES; };

  SC.RunLoop.begin();
  layer = view1.get('layer');
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_BACKSPACE, keyCode: SC.Event.KEY_BACKSPACE });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_TAB, keyCode: SC.Event.KEY_TAB });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_TAB, keyCode: SC.Event.KEY_TAB, shiftKey: YES });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_RETURN, keyCode: SC.Event.KEY_RETURN });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_ESC, keyCode: SC.Event.KEY_ESC });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_LEFT, keyCode: SC.Event.KEY_LEFT });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_UP, keyCode: SC.Event.KEY_UP });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_DOWN, keyCode: SC.Event.KEY_DOWN });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_RIGHT, keyCode: SC.Event.KEY_RIGHT });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_DELETE, keyCode: SC.Event.KEY_DELETE });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_HOME, keyCode: SC.Event.KEY_HOME });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_END, keyCode: SC.Event.KEY_END });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_PAGEUP, keyCode: SC.Event.KEY_PAGEUP });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_PAGEDOWN, keyCode: SC.Event.KEY_PAGEDOWN });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_INSERT, keyCode: SC.Event.KEY_INSERT });
  view1.keyDown(evt);
  SC.RunLoop.end();

  // Test.
  ok(deleteBackwardFlag, 'deleteBackward should have been triggered.');
  ok(insertTabFlag, 'insertTab should have been triggered.');
  ok(insertBacktabFlag, 'insertBacktab should have been triggered.');
  ok(insertNewlineFlag, 'insertNewline should have been triggered.');
  ok(cancelFlag, 'cancel should have been triggered.');
  ok(moveLeftFlag, 'moveLeft should have been triggered.');
  ok(moveUpFlag, 'moveUp should have been triggered.');
  ok(moveDownFlag, 'moveDown should have been triggered.');
  ok(moveRightFlag, 'moveRight should have been triggered.');
  ok(deleteForwardFlag, 'deleteForward should have been triggered.');
  ok(moveToBeginningOfDocumentFlag, 'moveToBeginningOfDocument should have been triggered.');
  ok(moveToEndOfDocumentFlag, 'moveToEndOfDocument should have been triggered.');
  ok(pageUpFlag, 'pageUp should have been triggered.');
  ok(pageDownFlag, 'pageDown should have been triggered.');
});

test("tab should attempt to move focus", function() {
  var nextValidKeyViewFlag = NO,
      previousValidKeyViewFlag = NO,
      evt,
      layer;

  view1.nextValidKeyView = function() { nextValidKeyViewFlag = YES; return null; }.property();
  view1.previousValidKeyView = function() { previousValidKeyViewFlag = YES; return null; }.property();

  SC.RunLoop.begin();
  layer = view1.get('layer');
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_TAB, keyCode: SC.Event.KEY_TAB });
  view1.keyDown(evt);
  evt = SC.Event.simulateEvent(layer, 'keydown', { which: SC.Event.KEY_TAB, keyCode: SC.Event.KEY_TAB, shiftKey: YES });
  view1.keyDown(evt);
  SC.RunLoop.end();

  ok(nextValidKeyViewFlag, 'nextValidKeyView should have been called.');
  ok(previousValidKeyViewFlag, 'previousValidKeyView should have been called.');
});

// test("isEnabled=NO should add disabled attr to input", function() {
//   SC.RunLoop.begin();
//   view1.set('isEnabled', NO);
//   SC.RunLoop.end();
//   ok(view1.$input().attr('disabled'), 'should have disabled attr');
//   view1.set('isEditing',YES);
//   ok(view1.get('value') === 'SproutCore', 'value cannot be changed');
//   });

