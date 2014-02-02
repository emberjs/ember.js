// ==========================================================================
// Project:   Test - mainPage
// Copyright: @2011 My Company, Inc.
// ==========================================================================
/*globals Test */

Test.mainPage = SC.Page.create({

  fooView: SC.outlet('Test.fooPage.mainView'),
  
  barView: SC.outlet('Test.barPage.mainView'),
  
  emptyView: SC.View.design(),

  mainPane: SC.MainPane.design({
    
    childViews: 'headerView containerView'.w(),
    
    headerView: SC.View.design({
      layout: { top: 0, left: 0, right: 0, height: 50 },
      childViews: 'switchModeView'.w(),
      switchModeView: SC.SegmentedView.design({
        layout: { centerX: 0, centerY: 0, height: 24, width: 100 },
        items: [
          { title: 'Foo', value: Test.MODE_FOO, action: 'switchToFooMode' },
          { title: 'Bar', value: Test.MODE_BAR, action: 'switchToBarMode' }
        ],
        itemTitleKey: 'title',
        itemValueKey: 'value',
        itemActionKey: 'action',
        valueBinding: SC.Binding.oneWay('Test.mainController.mode')
      })
    }),
    
    containerView: SC.ContainerView.design({
      layout: { top: 50, left: 0, right: 0, bottom: 0 },
      contentViewBinding: SC.Binding.transform(function(mode) {
        if (mode === Test.MODE_FOO) return Test.fooPage.get('mainView');
        if (mode === Test.MODE_BAR) return Test.barPage.get('mainView');
        return Test.mainPage.get('emptyView');
      }).oneWay('Test.mainController.mode')
    })
    
  })

});
