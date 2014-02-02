// ==========================================================================
// Project:   Welcome - mainPage
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*global Welcome */

// This page describes the main user interface for your application.
Welcome.mainPage = SC.Page.design({

  // The main pane is made visible on screen as soon as your app is loaded.
  // Add childViews to this pane for views to display immediately on page
  // load.
  mainPane: SC.MainPane.design({
    childViews: 'contentView'.w(),

    contentView: SC.View.design({
      layout: { width: 280, height: 340, centerX: 0, centerY: 0 },
      childViews: ['heading', 'appSelector', 'launchApplication'],

      heading: SC.ImageView.design({
        layout: { width: 271, centerX: 0, top: 0, height: 60 },
        value: sc_static('images/sproutcore.png')
      }),

      appSelector: SC.View.design({
        layout: { top: 80, left: 0, right: 0, bottom: 46 },
        childViews: 'scrollView'.w(),
        classNames: 'app-selector',

        scrollView: SC.ScrollView.design({
          layout: { left: 0, top: 0, right: 0, bottom: 0 },
          hasHorizontalScroller: NO,

          contentView: SC.ListView.design({
            rowHeight: 40,

            contentBinding: SC.Binding.oneWay("Welcome.targetsController.appsOnly"),
            selectionBinding: "Welcome.targetsController.selection",
            isEnabledBinding: SC.Binding.oneWay("Welcome.targetsController.canLoadApp"),

            contentValueKey: "displayName",
            contentIconKey: "targetIcon",
            hasContentIcon: YES,

            // Show all the items for best performance since the list is short.
            contentIndexesInRect: function () { return null; }.property().cacheable(),

            target: "Welcome.targetsController",
            action: "loadApplication"
          })
        })
      }),

      launchApplication: SC.ButtonView.design({
        layout: { bottom: 0, height: 30, width: 160, centerX: 0 },
        isEnabledBinding: SC.Binding.oneWay("Welcome.targetsController.launchEnabled"),
        controlSize: SC.HUGE_CONTROL_SIZE,
        title: "Launch Application",
        isDefault: YES,
        target: "Welcome.targetsController",
        action: "loadApplication"
      })

    })
  })

});
