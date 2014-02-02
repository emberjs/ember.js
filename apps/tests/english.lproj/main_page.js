// ==========================================================================
// Project:   SproutCore Test Runner
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global TestRunner */

sc_require('views/offset_checkbox');

// This page describes the main user interface for your application.
TestRunner.mainPage = SC.Page.design({

  /**
    This is the main pane that is displayed when the application loads.  The
    main views are configured here including the sidebar, toolbar at the
    bottom and the iframe.
  */
  mainPane: SC.MainPane.design({

    defaultResponder: TestRunner.statechart,

    // when defining a generic view, just name the properties holding your
    // child views here.  the w() helper is like calling split(' ')
    childViews: ['splitView', 'toolbarView'],

    // This is the main split view on the top of the screen.  Note that
    // since SC.SplitView defines a few special types of views you don't need
    // to define a childViews array.
    splitView: SC.SplitView.design({

      layout: { bottom: 36 },

      topLeftView: SC.ScrollView.design(SC.SplitChild, {

        size: 200,

        hasHorizontalScroller: NO, // disable horizontal scrolling
        contentView: SC.SourceListView.design({
          action: 'selectTarget',
          actOnSelect: true,
          contentBinding: SC.Binding.oneWay('TestRunner.sourceController.arrangedObjects'),
          selectionBinding: 'TestRunner.targetsController.selection',
          contentValueKey: 'displayName',
          hasContentIcon: true,
          contentIconKey:  'targetIcon'
        })
      }),

      bottomRightView: SC.ContainerView.design(SC.SplitChild, {
        autoResizeStyle: SC.RESIZE_AUTOMATIC,
        nowShowingBinding: SC.Binding.oneWay("TestRunner.currentScene")
      })
    }),

    // This is the toolbar view that appears at the bottom.  We include two
    // child views that alight right and left so that we can add buttons to
    // them and let them layout themselves.
    toolbarView: SC.ToolbarView.design({

      layout: { bottom: 0, borderTop: 1, height: 36, zIndex: 2 },

      childViews: ['logo', 'runTestsButton'], // , 'continuousIntegrationCheckbox'

      logo: SC.View.design({
        layout: { width: 200 },
        classNames: ['app-title'],
        tagName: 'h1',
        render: function (context) {
          var img_url = sc_static('images/sproutcore-32.png');
          context.push('<img src="%@" />'.fmt(img_url));
          context.push('<span>', "_Test Runner".loc(), "</span>");
        }
      }),

      // Disabled
      continuousIntegrationCheckbox: TestRunner.OffsetCheckboxView.design({
        title: "Continuous Integration",
        offsetBinding: SC.Binding.oneWay("TestRunner.sourceController.sidebarThickness"),
        valueBinding: "TestRunner.testsController.useContinuousIntegration",
        isEnabledBinding: SC.Binding.oneWay("TestRunner.testsController.length").bool(),
        layout: { height: 18, centerY: 1, width: 170, left: 206 }
      }),

      runTestsButton: SC.ButtonView.design({
        action: 'runTests',
        title: "Reload",
        // isEnabledBinding: SC.Binding.oneWay("TestRunner.testsController.length").bool(),
        isVisibleBinding: SC.Binding.oneWay('TestRunner.testController.content').bool(),
        layout: { height: 24, centerY: 0, width: 90, right: 12 }
      })

    })
  }),

  targetsLoading: SC.View.design({
    childViews: "labelView".w(),

    labelView: SC.LabelView.design({
      layout: { centerX: 0, centerY: 0, height: 24, width: 200, opacity: 0.8 },
      controlSize: SC.LARGE_CONTROL_SIZE,
      classNames: ['center-label'],
      value: "_Loading Targets".loc()
    })
  }),

  noTargets: SC.View.design({
    childViews: "labelView".w(),

    labelView: SC.LabelView.design({
      layout: { centerX: 0, centerY: 0, height: 24, width: 200, opacity: 0.8 },
      classNames: ['center-label'],
      controlSize: SC.LARGE_CONTROL_SIZE,
      value: "_No Targets".loc()
    })
  }),

  noTests: SC.View.design({
    childViews: "labelView".w(),

    labelView: SC.LabelView.design({
      layout: { centerX: 0, centerY: 0, height: 24, width: 200, opacity: 0.8 },
      classNames: ['center-label'],
      controlSize: SC.LARGE_CONTROL_SIZE,
      value: "_No Tests".loc()
    })
  }),

  testsLoading: SC.View.design({
    childViews: "labelView".w(),

    labelView: SC.LabelView.design({
      layout: { centerX: 0, centerY: 0, height: 24, width: 200, opacity: 0.8 },
      classNames: ['center-label'],
      controlSize: SC.LARGE_CONTROL_SIZE,
      value: "_Loading Tests".loc()
    })
  }),

  testsNone: SC.View.design({
    childViews: ['labelView'],

    labelView: SC.LabelView.design({
      layout: { centerX: 0, centerY: 0, height: 24, width: 200, opacity: 0.8 },
      classNames: ['center-label'],
      controlSize: SC.LARGE_CONTROL_SIZE,
      value: "_No Target Selected".loc()
    })
  }),

  /* list view:  displayed when you are in the READY_LIST state, this view
     shows all of the unit tests for the selected target.
  */
  testsMaster: SC.ScrollView.design({

    // configure scroll view do hide horizontal scroller
    hasHorizontalScroller: NO,

    // this is the list view that actually shows the content
    contentView: SC.ListView.design({

      // bind to the testsController, which is an ArrayController managing the
      // tests for the currently selected target.
      contentBinding: SC.Binding.oneWay('TestRunner.testsController.arrangedObjects'),
      selectionBinding: 'TestRunner.testsController.selection',

      // configure the display options for the item itself.  The row height is
      // larger to make this look more like a menu.  Also by default show
      // the title.
      classNames: ['test-list'], // used by CSS
      rowHeight: 32,

      hasContentIcon: YES,
      contentIconKey: "icon",

      hasContentBranch: YES,
      contentIsBranchKey: 'isRunnable',

      contentValueKey: "displayName",

      // the following two options will make the collection view act like a
      // menu.  It will send the action down the responder chain whenever you
      // click on an item.  When in the READY state, this action will show the
      // detail view.
      actOnSelect: YES,
      action: "selectTest"

    })
  }),

  testsDetail: SC.View.design({
    childViews: ['navigationView', 'webView'],

    navigationView: SC.ToolbarView.design({
      classNames: 'navigation-bar',

      layout: { borderBottom: 1, top: 0, left: 0, right: 0, height: 34, zIndex: 2 },
      childViews: ['backButton', 'locationLabel'],

      backButton: SC.ButtonView.design({
        layout: { left: 8, centerY: 0, width: 80, height: 24 },
        title: "« Tests",
        action: "back"
      }),

      locationLabel: SC.LabelView.design({
        classNames: ['location-label'],
        escapeHTML: false,
        layout: { right: 10, centerY: 0, height: 16, left: 100 },
        contentBinding: SC.Binding.oneWay("TestRunner.testController.content"),
        value: function () {
          var content = this.get('content');

          if (content) {
            return '<a href="%@" target="_blank">%@</a>'.fmt(content.get('url'), content.get('displayName'));
          } else {
            return '';
          }
        }.property('content')
      })

    }),

    webView: SC.WebView.design({
      layout: { top: 34, left: 2, right: 0, bottom: 0 },
      valueBinding: SC.Binding.oneWay("TestRunner.testController.uncachedUrl")
    })
  })

});


