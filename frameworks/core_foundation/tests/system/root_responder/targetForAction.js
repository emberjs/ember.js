// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same Q$ htmlbody Dummy */

var r, r2, sender, pane, pane2, barView, fooView, defaultResponder;
var keyPane, mainPane, globalResponder, globalResponderContext, actionSender ;

var CommonSetup = {
  setup: function() { 
    
    actionSender = null ; // use for sendAction tests
    var action = function(sender) { actionSender = sender; } ;
    
    sender = SC.Object.create();
    
    // default responder for each pane
    defaultResponder = SC.Object.create({ 
      defaultAction: action 
    });

    // global default responder set on RootResponder
    globalResponder = SC.Object.create({ 
      globalAction: action 
    });
    
    // global default responder as a responder context 
    // set on RootResponder
    globalResponderContext = SC.Object.create(SC.ResponderContext, {
      globalAction: action
    });
    
    // explicit pane
    pane = SC.Pane.create({ 
      acceptsKeyPane: YES,
      defaultResponder: defaultResponder,
      childViews: [SC.View.extend({
        bar: action,  // implement bar action
        childViews: [SC.View.extend({
          foo: action // implement foo action
        })]    
      })],
      
      paneAction: action
       
    });
    
    pane2 = SC.Pane.create({ 
      acceptsKeyPane: YES,
      defaultResponder: defaultResponder,
      childViews: [SC.View.extend({
        bar: action,  // implement bar action
        childViews: [SC.View.extend({
          foo: action // implement foo action
        })]    
      })],
      
      paneAction: action,
      
      keyAction: action,
      mainAction: action,
      globalAction: action
    });
    
    keyPane = SC.Pane.create({
      acceptsKeyPane: YES,
      keyAction: action
    });
    keyPane.firstResponder = keyPane ;

    mainPane = SC.Pane.create({
      acceptsKeyPane: YES,
      mainAction: action
    });
    mainPane.firstResponder = mainPane ;

    r = SC.RootResponder.create({
      mainPane: mainPane, 
      keyPane:  keyPane,
      defaultResponder: globalResponder 
    }); 
    
    r2 = SC.RootResponder.create({
      mainPane: mainPane,
      keyPane: keyPane,
      defaultResponder: globalResponderContext
    });
    
    barView = pane.childViews[0];
    ok(barView.bar, 'barView should implement bar');
    
    fooView = barView.childViews[0];
    ok(fooView.foo, 'fooView should implement foo');
    
    // setup dummy namespace
    window.Dummy = { 
      object: SC.Object.create({ foo: action }),
      hash: { foo: action } 
    };
    
  },

  teardown: function() {
    r = r2 = sender = pane = window.Dummy = barView = fooView = null; 
    defaultResponder = keyPane = mainPane = globalResponder = null; 
    globalResponderContext = null;    
  }
};

// ..........................................................
// targetForAction()
// 
module("SC.RootResponder#targetForAction", CommonSetup);


test("pass property path string as target", function() {
  var result = r.targetForAction('foo', 'Dummy.object');
  
  equals(result, Dummy.object, 'should find DummyNamespace.object if it implements the action');

  equals(r.targetForAction("foo", "Dummy.hash"), Dummy.hash, 'should return if object found at path and it has function, even if it does not use respondsTo');
  
  equals(r.targetForAction('bar', 'Dummy.object'), null, 'should return null if found DummyNamepace.object but does not implement action');
  
  equals(r.targetForAction('foo', 'Dummy.imaginary.item'), null, 'should return null if property path could not resolve');  
});

test("pass real object as target", function() {
  equals(r.targetForAction('foo', Dummy.object), Dummy.object, 'returns target if respondsTo() action');
  equals(r.targetForAction('foo', Dummy.hash), Dummy.hash, 'returns target if targets does not implement respondsTo() but does have action');
  equals(r.targetForAction('bar', Dummy.object), null, 'returns null of target does not implement action name');
});

test("no target, explicit pane, nested firstResponder", function() {
  
  pane.set('firstResponder', fooView) ;
  equals(r.targetForAction('foo', null, null, pane), fooView, 
    'should return firstResponder if implementation action');
    
  equals(r.targetForAction('bar', null, null, pane), barView, 
    'should return parent of firstResponder');

  equals(r.targetForAction('paneAction', null, null, pane), pane, 
    'should return pane action');
  
  equals(r.targetForAction('defaultAction', null, null, pane), 
    defaultResponder, 'should return defaultResponder');

  equals(r.targetForAction('imaginaryAction', null, null, pane), null, 
    'should return null for not-found action');
});


test("no target, explicit pane, top-level firstResponder", function() {
  
  pane.set('firstResponder', barView) ; // fooView is child...
  
  equals(r.targetForAction('foo', null, null, pane), null, 
    'should NOT return child of firstResponder');
    
  equals(r.targetForAction('bar', null, null, pane), barView, 
    'should return firstResponder');

  equals(r.targetForAction('paneAction', null, null, pane), pane, 
    'should return pane action');
  
  equals(r.targetForAction('defaultAction', null, null, pane), 
    defaultResponder, 'should return defaultResponder');

  equals(r.targetForAction('imaginaryAction', null, null, pane), null, 
    'should return null for not-found action');
});

test("no target, explicit pane, pane is first responder", function() {
  
  pane.set('firstResponder', pane) ; 
  
  equals(r.targetForAction('foo', null, null, pane), null, 
    'should NOT return child view');
    
  equals(r.targetForAction('bar', null, null, pane), null, 
    'should NOT return child view');

  equals(r.targetForAction('paneAction', null, null, pane), pane, 
    'should return pane action');
  
  equals(r.targetForAction('defaultAction', null, null, pane), 
    defaultResponder, 'should return defaultResponder');

  equals(r.targetForAction('imaginaryAction', null, null, pane), null, 
    'should return null for not-found action');
});

test("no target, explicit pane, no first responder", function() {
  
  pane.set('firstResponder', null) ; 
  
  equals(r.targetForAction('foo', null, null, pane), null, 
    'should NOT return child view');
    
  equals(r.targetForAction('bar', null, null, pane), null, 
    'should NOT return child view');

  equals(r.targetForAction('paneAction', null, null, pane), pane, 
    'should return pane');
  
  equals(r.targetForAction('defaultAction', null, null, pane), 
    defaultResponder, 'should return defaultResponder');
    
  equals(r.targetForAction('imaginaryAction', null, null, pane), null, 
    'should return null for not-found action');
  
});

test("no target, explicit pane, does not implement action", function() {
  equals(r.targetForAction('keyAction', null, null, pane), keyPane,
    'should return keyPane');
    
  equals(r.targetForAction('mainAction', null, null, pane), mainPane,
    'should return mainPane');

  equals(r.targetForAction('globalAction', null, null, pane), globalResponder,
    'should return global defaultResponder');
      
  equals(r2.targetForAction('globalAction', null, null, pane), globalResponderContext,
    'should return global defaultResponder');
});

test("no target, explicit pane, does implement action", function() {
  equals(r.targetForAction('keyAction', null, null, pane2), pane2,
    'should return pane');
    
  equals(r.targetForAction('mainAction', null, null, pane2), pane2,
    'should return pane');

  equals(r.targetForAction('globalAction', null, null, pane2), pane2,
    'should return pane');
    
  equals(r2.targetForAction('globalAction', null, null, pane2), pane2,
    'should return pane');  
});

test("no target, no explicit pane", function() {
  equals(r.targetForAction('keyAction'), keyPane, 'should find keyPane');
  equals(r.targetForAction('mainAction'), mainPane, 'should find mainPane');
  equals(r.targetForAction('globalAction'), globalResponder,
    'should find global defaultResponder');
  equals(r.targetForAction('imaginaryAction'), null, 'should return null for not-found action');
  equals(r2.targetForAction('globalAction'), globalResponderContext,
    'should find global defaultResponder');
});

// ..........................................................
// sendAction()
// 
module("SC.RootResponder#sendAction", CommonSetup) ;

test("if pane passed, invokes action on pane if found", function() {
  pane.firstResponder = pane;
  r.sendAction('paneAction', null, sender, pane);
  equals(actionSender, sender, 'action did invoke');
  
  actionSender = null;
  r.sendAction('imaginaryAction', null, sender, pane);
  equals(actionSender, null, 'action did not invoke');
});

test("searches panes if none passed, invokes action if found", function() {
  r.sendAction('keyAction', null, sender);
  equals(actionSender, sender, 'action did invoke');
  
  actionSender = null;
  r.sendAction('imaginaryAction', null, sender);
  equals(actionSender, null, 'action did not invoke');
});

test("searches target if passed, invokes action if found", function() {
  r.sendAction('foo', fooView, sender);
  equals(actionSender, sender, 'action did invoke');
  
  actionSender = null;
  r.sendAction('imaginaryAction', fooView, sender);
  equals(actionSender, null, 'action did not invoke');
});

