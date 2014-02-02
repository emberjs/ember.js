// ==========================================================================
// Project:   Showcase
// Copyright: ©2012 7x7 Software, Inc.
// License:   Licensed under MIT license
// ==========================================================================
/*global module, test, same*/

var view;
module("SC.View#borderFrame", {
  setup: function () {
    SC.run(function () {
      view = SC.View.create({
        layout: { width: 100, height: 100 }
      });
    });
  },

  teardown: function () {
    view.destroy();
    view = null;
  }
});

test("The borderFrame property of the view should include the borders from the layout.", function () {
  var borderFrame,
    frame;

  // No borders.
  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 0, y: 0, width: 100, height: 100 }, "The frame without borders is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame without borders is");

  // Right 5px border.
  SC.run(function () {
    view.adjust('borderRight', 5);
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 0, y: 0, width: 95, height: 100 }, "The frame with 5px right border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 5px right border is");

  // Top 10px border.
  SC.run(function () {
    view.adjust('borderTop', 10);
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 0, y: 10, width: 95, height: 90 }, "The frame with 5px right border & 10px top border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 5px right border & 10px top border is");

  // Left 15px border.
  SC.run(function () {
    view.adjust('borderLeft', 15);
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 15, y: 10, width: 80, height: 90 }, "The frame with 5px right border & 10px top border & 15px left border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 5px right border & 10px top border & 15px left border is");

  // Bottom 20px border.
  SC.run(function () {
    view.adjust('borderBottom', 20);
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 15, y: 10, width: 80, height: 70 }, "The frame with 5px right border & 10px top border & 15px left border & 20px bottom border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 5px right border & 10px top border & 15px left border & 20px bottom border is");

  // 25px border.
  SC.run(function () {
    view.set('layout', { width: 100, height: 100, border: 25 });
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 25, y: 25, width: 50, height: 50 }, "The frame with 25px border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 25px border is");

});


test("The borderFrame property of the view should be correct for view with useStaticLayout.", function () {
  var borderFrame,
    frame,
    pane;

  view.set('useStaticLayout', true);

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, null, "The frame with useStaticLayout true is");
  same(borderFrame, null, "The borderFrame with useStaticLayout true is");

  SC.run(function () {
    pane = SC.Pane.create({
      childViews: [view]
    }).append();
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 0, y: 0, width: 100, height: 100 }, "The frame with useStaticLayout true after rendering is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with useStaticLayout true after rendering is");

  // Right 5px border.
  SC.run(function () {
    view.adjust('borderRight', 5);
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 0, y: 0, width: 95, height: 100 }, "The frame with 5px right border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 5px right border is");

  // Top 10px border.
  SC.run(function () {
    view.adjust('borderTop', 10);
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 0, y: 10, width: 95, height: 90 }, "The frame with 5px right border & 10px top border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 5px right border & 10px top border is");

  // Left 15px border.
  SC.run(function () {
    view.adjust('borderLeft', 15);
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 15, y: 10, width: 80, height: 90 }, "The frame with 5px right border & 10px top border & 15px left border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 5px right border & 10px top border & 15px left border is");

  // Bottom 20px border.
  SC.run(function () {
    view.adjust('borderBottom', 20);
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 15, y: 10, width: 80, height: 70 }, "The frame with 5px right border & 10px top border & 15px left border & 20px bottom border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 5px right border & 10px top border & 15px left border & 20px bottom border is");

  // 25px border.
  SC.run(function () {
    view.set('layout', { width: 100, height: 100, border: 25 });
  });

  frame = view.get('frame');
  borderFrame = view.get('borderFrame');

  same(frame, { x: 25, y: 25, width: 50, height: 50 }, "The frame with 25px border is");
  same(borderFrame, { x: 0, y: 0, width: 100, height: 100 }, "The borderFrame with 25px border is");

  pane.destroy();
});
