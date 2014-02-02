// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright ©2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.StaticContentView - Basic UI');

test("Frame Recalculation", function() {
  var callCount = 0, baseCount, content;
  var pane = SC.PanelPane.create({
    layout: { width: 500, height: 500, centerX: 0, centerY: 0 },
    contentView: SC.ScrollView.design({
      layout: { top: 10, right: 10, bottom: 10, left: 10 }
    })
  });
  var view = SC.StaticContentView.create({
        content: '<p style="position: relative; margin-top: 80px; font-size: 3em">Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>',
        frameDidChange: function() {
          callCount += 1;
        }.observes('frame')
      });
   pane.setPath('contentView.contentView', view);
   pane.append();
   baseCount = callCount;
   ok(callCount > 0, 'precond - frame should be called at least once when displayed');
   callCount = 0;

   SC.run(function() { pane.adjust('width', 499); });
   ok(callCount > 1, 'frame should recompute after parent resizes');
   callCount = 0;

   content = 'For today, we celebrate the first glorious anniversary of the Information Purification Directives. We have created, for the first time in all history, a garden of pure ideology. Where each worker may bloom secure from the pests of contradictory and confusing truths.Our Unification of Thought is more powerful a weapon than any fleet or army on earth. We are one people. With one will. One resolve. One cause. Our enemies shall talk themselves to death. And we will bury them with their own confusion. We shall prevail!';
   view.set('content', content);
   ok(callCount > 0, 'frame should recompute after content changes');
   callCount = 0;

   SC.RunLoop.begin().end();
   var layer = view.get('layer');

   ok(layer.innerHTML.indexOf(content) > -1, 'view should rerender when content changes');
   view.contentLayoutDidChange();
   ok(callCount > 0, 'frame should recompute after calling contentLayoutDidChange()');

   pane.remove();
});