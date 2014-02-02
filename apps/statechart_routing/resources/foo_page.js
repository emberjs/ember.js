/*globals Test */

Test.fooPage = SC.Page.create({
  
  mainView: SC.View.design({
    layout: { top: 0, bottom: 0, left: 0, right: 0 },
    childViews: 'labelView'.w(),
    labelView: SC.LabelView.design({
      layout: { centerX: 0, centerY: 0, height: 24, width: 100 },
      value: 'In Foo Mode'
    })
  })
  
});