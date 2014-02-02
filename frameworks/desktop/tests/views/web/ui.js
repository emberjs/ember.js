// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test htmlbody ok equals same stop start v*/

(function() {
  var pane = SC.ControlTestPane.design()

  .add("basic", SC.WebView, {
    value: "/clock",
    layout: {
      width: 250,
      height: 150
    }
  }).add("change src/value", SC.WebView, {
    value: "/clock",
    layout: {
      width: 250,
      height: 150
    }
  }).add("auto resize", SC.WebView, {
    value: sc_static('iframe'),
    includeImage: sc_static('a_sample_image.jpg'), // this simply ensures that the image is added to the build
    shouldAutoResize: YES,
    layout: {
      width: 250,
      height: 150
    }
  }).add("don\'t auto resize", SC.WebView, {
    shouldAutoResize: NO,
    //set the value later when you need it
    layout: {
      width: 250,
      height: 150
    }
  });

  // ..........................................................
  // TEST VIEWS
  //
  module('SC.WebView UI', pane.standardSetup());

  test("attributes tests",
  function() {
    var view = pane.view('basic');
    var iframe = view.$('iframe');
    var rootElement = view.$();
    ok(view, 'view should exist');
    ok(view.get('value'), 'should have value property');
    equals(view.get('shouldAutoResize'), NO, 'should have autoresize off by default, shouldAutoResize');
    ok(rootElement.hasClass('sc-view'), 'should have sc-view css class');
    ok(rootElement.hasClass('sc-web-view'), 'should have sc-web-view css class');
    equals(rootElement.height(), 150, 'should have height');
    equals(rootElement.width(), 250, 'should have width');
    ok(iframe, 'should have iframe element');
    equals(iframe.attr('src'), "/clock", "should have source as /clock");
    ok(iframe[0].contentWindow, 'should have content window if src is from the same domain');

  });

  test('change src/value',
  function() {
    var view = pane.view('change src/value');
    var iframe = view.$('iframe');
    equals(view.get('value'), "/clock", "should have value property in view as \'/clock\' before changing source");
    SC.RunLoop.begin();
    view.set('value', "/store_configurator");
    SC.RunLoop.end();
    equals(view.get('value'), "/store_configurator", "should have value property in view as \'/store_configurator\' after changing source");
    equals(iframe.attr('src'), "/store_configurator", "should have source in the iframe as \'/store_configurator\'");
  });

  test('auto resize tests, shouldAutoResize:YES',
  function() {
    var view = pane.view('auto resize');
    //set the test wrapper element's overflow to auto so that you can see the resize magic'
    view.$()[0].parentNode.style.overflow = "auto";
    equals(view.get('shouldAutoResize'), YES, 'should have auto resize flag as true');
    stop();
    SC.Event.add(view.$('iframe')[0], 'load', this,
    function() {
      ok(view.$().height() > 150, "height of view should change based on content");
      ok(view.$().width() > 200, "width of view should change based on content");
      start();
    });
  });

  test('auto resize tests, shouldAutoResize:NO',
  function() {
    var view = pane.view('don\'t auto resize');
    equals(view.get('shouldAutoResize'), NO, 'should have auto resize flag as false');

    /** set the src a bit late so that the following onload event get's hooked
    up before it actually loads
    */
    SC.RunLoop.begin();
    view.set('value', sc_static('iframe'));
    SC.RunLoop.end();
    stop();
    SC.Event.add(view.$('iframe')[0], 'load', this,
    function() {
      ok(view.$().height() === 150, "height of view should not change based on content");
      ok(view.$().width() === 250, "width of view should not change based on content");
      start();
    });
  });

})();
