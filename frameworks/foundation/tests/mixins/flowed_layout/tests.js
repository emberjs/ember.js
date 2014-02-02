/**
  The FlowedLaoyut test engine takes expected layouts for a set of conditions. All units
  are expected in the horizontal orientation; they will be flipped automatically for vertical
  tests (and the view's width/height/fillWidth/etc. settings changed likewise).

  - With Wrap, 600x400.
  - With wrap, 400x600.
  - No wrap, 600x400.
  - No wrap, 400x600

  The expected positioning should be supplied to the checkPositions method:

  {
    wrap: {
      // these are by width (600x400 should use '600')
      '400': [ { left: ..., top: ..., width: ..., height: ... } ],
      '600': ...
    },
    noWrap: {
      ...
    }
  }

  It is a recursive process; each step has multiple possible varieties, and ALL
  combinations are tested. The first variety is always tested twice.

  For instance, it tests 600x400, then 400x600, then 600x400 again.

  - 600x400 or 400x600
  - Wrap on and wrap off
  - Horizontal or Vertical
*/

// helper to make a string from a hash
var str = function(obj) {
  var s = [];
  for (var i in obj) {
    s.push("" + i + ": " + obj[i]);
  }
  return "{ " + s.join(", ") + "}";
};

var checkSteps = [
  function wrap(view, positions, context) {
    SC.RunLoop.begin();
    view.set('canWrap', YES);
    SC.RunLoop.end();

    context.performNext(positions.wrap);

    SC.RunLoop.begin();
    view.set('canWrap', NO);
    SC.RunLoop.end();

    context.performNext(positions.noWrap);

    SC.RunLoop.begin();
    view.set('canWrap', YES);
    SC.RunLoop.end();

    context.performNext(positions.wrap);
  },

  function dimensions(view, positions, context) {
    SC.RunLoop.begin();
    view.set('layout', { left: 0, top: 0, width: 600, height: 400 });
    SC.RunLoop.end();

    context.performNext(positions['600']);

    SC.RunLoop.begin();
    view.set('layout', { left: 0, top: 0, width: 400, height: 600});
    SC.RunLoop.end();

    context.performNext(positions['400']);

    SC.RunLoop.begin();
    view.set('layout', { left: 0, top: 0, width: 600, height: 400 });
    SC.RunLoop.end();

    context.performNext(positions['600']);
  },

  function orientation(view, positions, context) {
    // we have to convert the positions. By now they should be a simple array,
    // so we just swap width and height.
    var verticalPositions = [];
    for (var idx = 0, len = positions.length; idx < len; idx++) {
      verticalPositions[idx] = {
        left: positions[idx].top,
        top: positions[idx].left,
        width: positions[idx].height,
        height: positions[idx].width
      };
    }

    function flipChildViews() {
      var cvs = view.get('childViews');
      for (var idx = 0, len = cvs.length; idx < len; idx++) {
        var layout = cvs[idx].get('layout');
        layout = SC.clone(layout);

        var tmp = layout.width;
        layout.width = layout.height;
        layout.height = tmp;

        cvs[idx].set('layout', layout);

        var fillWidth = cvs[idx].get('fillWidth');
        cvs[idx].set('fillWidth', cvs[idx].get('fillHeight'));
        cvs[idx].set('fillHeight', fillWidth);
      }
    }

    function flipLayout() {
      var l = SC.clone(view.get('layout'));
      var w = l.width;
      l.width= l.height;
      l.height = w;
      view.set('layout', l);

      if (view.get('flowPadding')) {
        l = SC.clone(view.get('flowPadding'));
        var tmp = l.left;
        l.left = l.top;
        l.top = tmp;

        tmp = l.right;
        l.right = l.bottom;
        l.bottom = tmp;
        view.set('flowPadding', l);
      }
    }

    SC.RunLoop.begin();
    view.set('layoutDirection', SC.LAYOUT_HORIZONTAL);
    SC.RunLoop.end();

    context.performNext(positions);

    SC.RunLoop.begin();
    view.set('layoutDirection', SC.LAYOUT_VERTICAL);
    flipChildViews();
    flipLayout();
    SC.RunLoop.end();

    context.performNext(verticalPositions);

    SC.RunLoop.begin();
    view.set('layoutDirection', SC.LAYOUT_HORIZONTAL);
    flipChildViews();
    flipLayout();
    SC.RunLoop.end();

    context.performNext(positions);
  },

  function final(view, positions, context) {
    var cvs = view.get('childViews');
    equals(cvs.length, positions.length, "PRECONDITION: number of child views is the same.");

    for (var idx = 0; idx < positions.length; idx++) {
      var cv = cvs[idx], expect = positions[idx], equal = YES;
      for (var i in expect) {
        if (expect.hasOwnProperty(i)) {
          if (cv.get('layout')[i] !== expect[i]) {
            equal = NO;
            break;
          }
        }
      }

      ok(
        equal,
        "Actual: " +
        str(cv.get('layout')) + "; expected: " +
        str(expect) + "; canWrap: " + view.get('canWrap') + "; " +
        "orientation: " + view.get('layoutDirection') + "; " +
        "layout: " + str(view.get('layout'))
      );
    }
  }
];

function checkPositions(view, positions) {
  view.set('isVisibleInWindow', YES);
  var context = {
    position: 0,
    performNext: function(positions) {
      var next = checkSteps[this.position];
      this.position++;
      next(view, positions, this);
      this.position--;
    }
  };

  context.performNext(positions);
}



module("FlowedLayout");

test("Basic flow", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 300, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  view.destroy();
});

module("FlowedLayout -- Alignment");
test("Align center", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 300, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.set('align', SC.ALIGN_CENTER);
  SC.RunLoop.end();

  expect.wrap['400'][2].left = 100;

  expect.noWrap['400'][0].left = -100;
  expect.noWrap['400'][1].left = 0;
  expect.noWrap['400'][2].left = 300;

  checkPositions(view, expect);
  view.destroy();
});

test("Align right", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 300, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.set('align', SC.ALIGN_RIGHT);
  SC.RunLoop.end();

  expect.wrap['400'][2].left = 200;

  expect.noWrap['400'][0].left = -200;
  expect.noWrap['400'][1].left = -100;
  expect.noWrap['400'][2].left = 200;

  checkPositions(view, expect);
  view.destroy();
});

test("Align justify", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 200, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.set('align', SC.ALIGN_JUSTIFY);
  SC.RunLoop.end();

  expect.wrap['400'][1].left = 200;

  expect.wrap['600'][1].left = 150;
  expect.wrap['600'][2].left = 400;

  expect.noWrap['600'][1].left = 150;
  expect.noWrap['600'][2].left = 400;

  checkPositions(view, expect);
  view.destroy();
});

module("FlowedLayout - Flags");

test("flowPadding", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 200, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.set('flowPadding', { left: 5, top: 8, right: 210, bottom: 0 });
  SC.RunLoop.end();

  expect.wrap[400][0].left = 5;
  expect.wrap[400][0].top = 8;
  expect.wrap[400][1].left = 5;
  expect.wrap[400][1].top = 108;
  expect.wrap[400][2].left = 5;
  expect.wrap[400][2].top = 208;

  expect.wrap[600][0].left = 5;
  expect.wrap[600][0].top = 8;
  expect.wrap[600][1].left = 105;
  expect.wrap[600][1].top = 8;
  expect.wrap[600][2].left = 5;
  expect.wrap[600][2].top = 108;

  expect.noWrap[400][0].left = 5;
  expect.noWrap[400][0].top = 8;
  expect.noWrap[400][1].left = 105;
  expect.noWrap[400][1].top = 8;
  expect.noWrap[400][2].left = 305;
  expect.noWrap[400][2].top = 8;

  expect.noWrap[600] = expect.noWrap[400];

  checkPositions(view, expect);

  view.destroy();
});

test("FlowedLayout - defaultFlowSpacing", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 200, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.set('defaultFlowSpacing', 5);
  SC.RunLoop.end();

  expect.wrap[400][0].left = 5;
  expect.wrap[400][0].top = 5;
  expect.wrap[400][1].left = 115;
  expect.wrap[400][1].top = 5;
  expect.wrap[400][2].left = 5;
  expect.wrap[400][2].top = 115;

  expect.wrap[600][0].left = 5;
  expect.wrap[600][0].top = 5;
  expect.wrap[600][1].left = 115;
  expect.wrap[600][1].top = 5;
  expect.wrap[600][2].left = 325;
  expect.wrap[600][2].top = 5;

  expect.noWrap[600] = expect.noWrap[400] = expect.wrap[600];

  checkPositions(view, expect);
  view.destroy();
});

module("FlowedLayout - Child View Flags");

test("startsNewRow", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 200, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    }
  };

  view._doRender();
  view._doAttach(document.body);

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.childViews[1].set('startsNewRow', YES);
  SC.RunLoop.end();

  expect.wrap[400][1].top = 100;
  expect.wrap[400][1].left = 0;

  expect.wrap[400][2].left = 200;
  expect.wrap[400][2].top = 100;

  expect.wrap[600] = expect.wrap[400];
  expect.noWrap = expect.wrap;

  checkPositions(view, expect);

  view.destroy();
});

test("flowSpacing", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 200, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.childViews[1].set('flowSpacing', { left: 20, top: 20, bottom: 20, right: 20 });
  SC.RunLoop.end();

  expect.wrap[400][1].left = 120;
  expect.wrap[400][1].top = 20;
  expect.wrap[400][2].top = 140;

  expect.wrap[600][1].left = 120;
  expect.wrap[600][1].top = 20;
  expect.wrap[600][2].left = 340;

  // because wrap is off, it should look like the results for wrapping 600 which,
  // due to its width, doesn't wrap either.
  expect.noWrap[400] = expect.noWrap[600] = expect.wrap[600];

  checkPositions(view, expect);

  view.destroy();
});

test("fillHeight", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 200, height: 50 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 50 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 50 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 50 },
        { left: 300, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 50 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.childViews[1].set('fillHeight', YES);
  SC.RunLoop.end();

  expect.wrap[400][1].height = 100;
  expect.wrap[600][1].height = 100;
  expect.noWrap[400][1].height = 100;
  expect.noWrap[600][1].height = 100;

  checkPositions(view, expect);

  view.destroy();
});


test("isSpacer", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    align: SC.ALIGN_LEFT,

    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 200, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 200, height: 100 },
        { left: 300, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  SC.RunLoop.begin();
  view.childViews[1].set('isSpacer', YES);
  SC.RunLoop.end();

  expect.wrap[400][1].width = 100;
  expect.wrap[400][2].top = 0;
  expect.wrap[400][2].left = 200;

  expect.wrap[600][1].width = 300;
  expect.wrap[600][2].left = 400;
  expect.noWrap[400] = expect.wrap[400];
  expect.noWrap[600] = expect.wrap[600];

  checkPositions(view, expect);

  view.destroy();
});

test("undefined and null can be passed for both defaultFlowSpacing and child's flowSpacing", function() {
  var view = SC.View.create(SC.FlowedLayout, {
    childViews: 'a b c'.w(),

    a: SC.View.create({
      layout: { width: 100, height: 100 }
    }),

    b: SC.View.create({
      layout: { width: 300, height: 100 }
    }),

    c: SC.View.create({
      layout: { width: 200, height: 100 }
    })
  });

  view._doRender();
  view._doAttach(document.body);

  var expect = {
    wrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 0, top: 100, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ]
    },

    noWrap: {
      400: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ],
      600: [
        { left: 0, top: 0, width: 100, height: 100 },
        { left: 100, top: 0, width: 300, height: 100 },
        { left: 400, top: 0, width: 200, height: 100 }
      ]
    }
  };

  checkPositions(view, expect);

  view.set('defaultFlowSpacing', undefined);

  checkPositions(view, expect);

  view.destroy();
});

