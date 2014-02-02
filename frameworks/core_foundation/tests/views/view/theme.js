// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok */

module("SC.View#themes");

// TODO: This isn't passing on master. Alex needs to take a look at it.

//var t1 = SC.Theme.addTheme("sc-test-1", SC.BaseTheme.extend({name: 'test-1' }));
//var t2 = SC.Theme.addTheme("sc-test-2", SC.BaseTheme.extend({name: 'test-2' }));

test("changing themes propagates to child view.");
//test("changing themes propagates to child view.", function() {
  //var view = SC.View.create({
    //"childViews": "child".w(),
    //theme: "sc-test-1",
    //child: SC.View.extend({
      
    //})
  //});
  
  //ok(t1 === view.get("theme"), "view's theme should be sc-test-1");
  //ok(t1 === view.child.get("theme"), "view's child's theme should be sc-test-1");
  //view.set('themeName', 'sc-test-2');
  //ok(t2 === view.get("theme"), "view's theme should be sc-test-2");
  //ok(t2 === view.child.get("theme"), "view's child's theme should be sc-test-2");
//});

test("adding child to parent propagates theme to child view.");
//test("adding child to parent propagates theme to child view.", function() {
  //var child = SC.View.create({});
  //var view = SC.View.create({
    //theme: "sc-test-1"
  //});
  
  //ok(t1 === view.get("theme"), "view's theme should be sc-test-1");
  //equals(child.get("theme"), SC.Theme.find('sc-base'), "view's child's theme should start at base theme");
  //view.appendChild(child);
  //equals(t1, child.get("theme"), "view's child's theme should be sc-test-1");
//});
