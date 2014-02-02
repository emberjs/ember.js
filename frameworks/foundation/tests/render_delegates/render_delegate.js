// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.RenderDelegate Base Tests
// ========================================================================

module("Render Delegates -- Inheritance");

test("Extending SC.RenderDelegate should include helpers", function() {
  var render_delegate = SC.RenderDelegate.create({ });

  // we'll test to make sure the sizing helper is around.
  ok(render_delegate.addSizeClassName, "Instantiated render delegate has helper method.");
});

test("sc_super works.", function() {

  var tick = 0, base_called_on = -1, derived_called_on = -1;

  var base = SC.RenderDelegate.create({
    aMethod: function() {
      base_called_on = tick;
      tick++;
    }
  });

  var derived = base.create({
    aMethod: function() {
      derived_called_on = tick;
      tick++;
      sc_super();
    }
  });

  derived.aMethod();

  equals(derived_called_on, 0, "Derived method called on tick 0");
  equals(base_called_on, 1, "Base called on tick 1");
});

test("Function.prototype.enhance works.", function() {

  var tick = 0, base_called_on = -1, derived_called_on = -1;

  var base = SC.RenderDelegate.create({
    aMethod: function(arg1, arg2) {
      equals(arg1, "ARG2", "First argument is swapped");
      equals(arg2, "ARG1", "Second argument is swapped");


      base_called_on = tick;
      tick++;
    }
  });

  var derived = base.create({
    aMethod: function(orig, arg1, arg2) {
      equals(arg1, "ARG1", "First argument is correct");
      equals(arg2, "ARG2", "Second argument is correct");

      derived_called_on = tick;
      tick++;

      // swap arguments
      orig(arg2, arg1);
    }.enhance()
  });

  derived.aMethod("ARG1", "ARG2");

  equals(derived_called_on, 0, "Derived method called on tick 0");
  equals(base_called_on, 1, "Base called on tick 1");
});

