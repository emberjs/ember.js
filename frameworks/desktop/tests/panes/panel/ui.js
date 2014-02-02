// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

module("SC.PanelPane UI");

var pane ;

test("verify panel content container is visible at correct location with right size", function() {
  pane = SC.PanelPane.create({
    layout: { width: 400, height: 200, centerX: 0, centerY: 0 },
    contentView: SC.View
  });
  pane.append();

  ok(pane.get('isVisibleInWindow'), 'pane.isVisibleInWindow should be YES');
  ok(pane.$().hasClass('sc-panel'), 'pane should have sc-panel class');
  ok(pane.childViews[0].get('isVisibleInWindow'), 'pane.div.isVisibleInWindow should be YES');
  ok(pane.childViews[0].$().hasClass('sc-view'), 'pane.div should have sc-view class');

  var pw = pane.layout.width;
  var ph = pane.layout.height;
  var ret = pane.layoutStyle();

  equals(ret.top, '50%', 'pane should center vertically');
  equals(ret.left, '50%', 'pane should center horizontally');
  equals(ret.width, '400px', 'pane should have width 400px');
  equals(ret.height, '200px', 'pane should have height 200px');
  equals(ret.marginLeft, -pw/2+'px', 'pane should shift-left %@ px'.fmt(-pw/2));
  equals(ret.marginTop, -ph/2+'px', 'pane should shift-top %@ px'.fmt(-ph/2));

  pane.remove();
  pane.destroy();
}) ;

test("Verify panel pane has aria role set", function() {
  var pane = SC.PanelPane.create({
    layout: { width: 400, height: 200, centerX: 0, centerY: 0 },
    contentView: SC.View
  });
  pane.append();

  equals(pane.$().attr('role'), 'dialog', "panel pane has role attribute set");

  pane.remove();
  pane.destroy();
});

test("Verify panel pane has aria-label attribute set, when ariaLabel is provided", function() {
  var pane = SC.PanelPane.create({
    layout: { width: 400, height: 200, centerX: 0, centerY: 0 },
    contentView: SC.View,
    ariaLabel: "Panel is labelled by this value for voiceover"
  });
  pane.append();

  equals(pane.$().attr('aria-label'), 'Panel is labelled by this value for voiceover', "panel pane has aria-labelledby attribute set");

  pane.remove();
  pane.destroy();
});

test("Verify panel pane's modal pane lifecycle", function() {
  var pane = SC.PanelPane.create({
    contentView: SC.View,
    modalPane: SC.ModalPane,
    isModal: YES
  });
  ok(pane.get('modalPane').isClass, "Modal pane class is not instantiated before is panel is appended.");
  pane.append();
  var modal = pane.get('modalPane');
  ok(!modal.isClass, "Modal pane class is instantiated when the panel is appended.");
  ok(modal.get('viewState') === SC.CoreView.ATTACHED_SHOWN, "Modal pane appends when panel pane is appended.");
  pane.remove();
  ok(modal.get('viewState') & SC.CoreView.UNATTACHED, "Modal pane is removed when panel pane is removed.");
  pane.destroy();
  ok(modal.get('isDestroyed'), "Modal pane is destroyed when its panel pane is destroyed.");

});

test("Verify SC.PanelPane#isModal", function() {
  SC.RunLoop.begin();
  var pane = SC.PanelPane.create({
    contentView: SC.View,
    modalPane: SC.ModalPane.create(),
    isModal: NO
  });
  pane.append();
  equals(pane.getPath('modalPane.viewState'), SC.CoreView.UNRENDERED, "Panel pane does not use modal pane when isModal is NO");
  pane.set('isModal', YES);
  equals(pane.getPath('modalPane.viewState'), SC.CoreView.ATTACHED_SHOWN, "Panel pane appends modal pane when isModal becomes YES");
  pane.set('isModal', NO);
  equals(pane.getPath('modalPane.viewState'), SC.CoreView.UNATTACHED, "Panel pane removes modal pane when isModal becomes NO");


  pane.destroy()

  // Tests an edge case where isModal turns YES during a transition out.
  pane = SC.PanelPane.create({
    contentView: SC.View,
    modalPane: SC.ModalPane.create(),
    isModal: NO,
    transitionOut: SC.View.FADE_OUT,
    transitionOutOptions: { duration: 0.1 }
  });
  pane.append();
  pane.remove(); // trigger transition and then willRemoveFromDocument
  pane.set('isModal', YES);
  equals(pane.getPath('modalPane.viewState'), SC.CoreView.UNRENDERED, "Panel pane does not add modal pane when isModal becomes YES while transitioning out");
  pane.destroy();
  SC.RunLoop.end();
});
