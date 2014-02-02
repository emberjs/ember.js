// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

(function() {
	var pane = SC.ControlTestPane.design()
		.add("diclosure", SC.DisclosureView, {
	      value: NO, isEnabled: YES
		})
		.add("selected", SC.DisclosureView, {
	      value: YES
		})
		.add("disabled", SC.DisclosureView, {
	      isEnabled: NO
		})
		.add("selected - disabled", SC.DisclosureView, {
	      value: YES, isEnabled: NO
		})

    .add("aria-role", SC.DisclosureView, {
        value: NO, isEnabled: YES
    })

    .add("aria-label", SC.DisclosureView, {
        value: YES, isEnabled: YES
    })
    .add("aria-expanded", SC.DisclosureView, {
        value: YES, isEnabled: YES
    })
    .add("aria-expanded-disabled", SC.DisclosureView, {
        value: NO, isEnabled: NO
    });

	module("TODO: Test SC.DisclosureView UI", pane.standardSetup());

	test("basic", function() {
		var view = pane.view('diclosure');
		ok(!view.$().hasClass('disabled'), 'should not have disabled class');
	    ok(!view.$().hasClass('sel'), 'should not have sel class');
		ok(!view.get('value'), 'should not be opened');
	    // ok(!input.attr('checked'), 'input should not be opened');
	    // ok(!input.attr('disabled'), 'input should not be disabled');
	  });

	  test("selected", function() {
	    var view = pane.view('selected');
	    ok(!view.$().hasClass('disabled'), 'should not have disabled class');
	    ok(view.$().hasClass('sel'), 'should have sel class');
		ok(view.get('value'), 'should be opened');
	    // ok(input.attr('checked'), 'input should be opened');
	    // ok(!input.attr('disabled'), 'input should not be disabled');
	  });

	  test("disabled", function() {
	    var view = pane.view('disabled');
	    ok(view.$().hasClass('disabled'), 'should have disabled class');
	    ok(!view.$().hasClass('sel'), 'should not have sel class');
		ok(!view.get('value'), 'should not be opened');
	    // ok(!input.attr('checked'), 'input should not be opened');
	    // ok(input.attr('disabled'), 'input should be disabled');
	  });

	  test("disabled - selected", function() {
	    var view = pane.view('selected - disabled');
	    ok(view.$().hasClass('disabled'), 'should have disabled class');
	    ok(view.$().hasClass('sel'), 'should have sel class');
		ok(view.get('value'), 'should be opened');
	    // ok(input.attr('checked'), 'input should be opened');
	    // ok(input.attr('disabled'), 'input should be disabled');
	  });

    test("aria role should be button for disclosure", function() {
      var view = pane.view('aria-role');
      equals(view.$().attr('role'), 'button', 'aria-role should be button');
    });

    test("aria label should be present", function() {
      var view = pane.view('aria-label');
      var labelled_by = document.getElementById(view.$().attr('aria-labelledby'));
      equals(view.$('span.sc-button-label')[0], labelled_by, 'aria-labelledby should be the label element');
    });

    test("aria pressed should be true if value is yes", function() {
      var view = pane.view('aria-expanded');
      equals(view.$().attr('aria-expanded'), 'true', 'aria-expanded should be true');
    });

    test("aria pressed should be false if value is no while the disclosure is disabled", function() {
      var view = pane.view('aria-expanded-disabled');
      var labelled_by = document.getElementById(view.$().attr('aria-labelledby'));
      equals(view.$('span.sc-button-label')[0], labelled_by, 'aria-labelledby should be the label element even if disabled');
      equals(view.$().attr('aria-expanded'), 'false', 'aria-expanded should be false');
    });

})();
