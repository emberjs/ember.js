// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

var pane, view , view1, view2, view3, view4 ;

module("SC.SelectButtonView",{

  //setup
  setup: function() {
    SC.RunLoop.begin();
    var isDue = NO ;

    //pane
    pane = SC.MainPane.create({
      objs : ["Around","The","World"],
      objs2 : [{ title: "Around", pos: 3},
        { title: "The", pos: 1},
        { title: "World", pos: 2 },
        { title: "Again", pos: 4}],
      selectedValue: "World",
      isDue: YES,
      childViews: [

        //view1
        SC.SelectButtonView.extend({
          objects: ["To","Back", "You"],
          disableSort: NO
        }),

        //view2
        SC.SelectButtonView.extend({
          objects: ["Drop","Down", "Menu"]
        }),

        //view3
        SC.SelectButtonView.extend({
          objectsBinding: '*owner.objs',
          valueBinding: '*owner.selectedValue',
          isVisibleBinding: '*owner.isDue'
        }),

        //view4
        SC.SelectButtonView.extend({
          objectsBinding: '*owner.objs2',
          valueBinding: '*owner.selectedValue',
          valueKey: 'title',
          nameKey: 'title',
          sortKey: 'pos'
        }),

        //view5
        SC.SelectButtonView.extend({
          objects: ["My","New", "List"]
        }),

        //view6
        SC.SelectButtonView.extend({
          objects: ["My","New", "List"],
          customViewClassName: 'custom-menu-item',
          customViewMenuOffsetWidth: 46
        })
      ]
    });

    view1 = pane.childViews[0] ;
    view2 = pane.childViews[1] ;
    view3 = pane.childViews[2] ;
    view4 = pane.childViews[3] ;
    view5 = pane.childViews[4] ;
    view6 = pane.childViews[5] ;

    pane.append(); // make sure there is a layer...
    SC.RunLoop.end();
  },

  //teardown
  teardown: function() {
    pane.remove();
    pane.destroy();
    pane = view = null ;
  }
});

//test1
test("Check if objectBinding works", function() {
  var obj = view3.objects ;
  equals('Around',obj.get(0),'First item should be') ;
  equals('The',obj.get(1),'Second item should be') ;
  equals('World',obj.get(2),'Last item should be') ;
});

//test2
test("Check if valueBinding works", function() {
  equals('World',view4.get('value'),'Value should be') ;
});

//test3
test("Check if isVisibleBinding works", function() {
  var isDue = pane.isDue ;
  SC.RunLoop.begin() ;
  pane.set('isDue', NO) ;
  SC.RunLoop.end() ;
  ok(!view3.get('isVisibleInWindow'), 'view2.isVisibleInWindow should be NO') ;
});

//test4
test("SelectButton with objects", function() {
  equals(3,view1.objects.length,'The number of options in selectButton Menu should be') ;
  equals(null,view1.nameKey,'the selectButton should not have any name key') ;
  equals(null,view1.valueKey,'the selectButton should not have any value key') ;
});

//test5
test("sortObjects() sorts the items of the Drop Down component", function() {
  var obj = view1.objects;
  view1.objects = view1.sortObjects(obj);

  equals("Back",obj.get(0),'First item should be') ;
  equals("To",obj.get(1),'Second item should be') ;
  equals("You",obj.get(2),'Third item should be') ;
});

//test6
test("rebuildMenu() populates the Drop Down Menu with new data", function() {
  var newObj = ['Rebuild', 'Drop', 'Down', 'Menu'] ;
  view2.objects = newObj;
  var obj = view2.objects;
  equals('Rebuild',obj.get(0),'First item should be') ;
  equals('Drop',obj.get(1),'Second item should be') ;
  equals('Down',obj.get(2),'Third item should be') ;
  equals('Menu',obj.get(3),'Fourth item should be') ;
});

//test7
test("isEnabled=NO should add disabled class", function() {
  SC.RunLoop.begin() ;
    view1.set('isEnabled', NO) ;
  SC.RunLoop.end() ;
  ok(view1.$().hasClass('disabled'), 'should have disabled class') ;
});

//test8
test("objects should change on changing the binding", function() {
  SC.RunLoop.begin();
    var newObjects = ['Bound','Objects'] ;
    pane.set('objs', newObjects) ;
  SC.RunLoop.end() ;

  var objects = view3.objects ;
  newObjects = pane.objs ;
  ok(objects===newObjects, 'Objects should be bound') ;
});

//test9
test("Check if setting a value actually changes the selection value", function() {
  SC.RunLoop.begin() ;
    view2.set('value','Menu') ;
  SC.RunLoop.end() ;

  equals(view2.get('value'), 'Menu', 'value of Drop down should change to') ;
}) ;

//test10
test("objects should change on changing the binding", function() {
  SC.RunLoop.begin() ;
    var newObjects = ['Bound','Objects'] ;
    pane.set('objs', newObjects) ;
  SC.RunLoop.end() ;

  var objects = view3.objects ;
  newObjects = pane.objs ;
  ok(objects===newObjects, 'Objects should be bound') ;
});

//test11
test("The properties for select button should take default values unless specified", function() {
  var prop1 = view5.get('customViewClassName');
  var prop2 = view5.get('customViewMenuOffsetWidth');
  equals(prop1,null,'Custom view class name should be null');
  equals(prop2,0,'Custom view menu off set width should be 0');
});

//test12
test("The properties for select button should take the specified values", function() {
  var prop1 = view6.get('customViewClassName');
  var prop2 = view6.get('customViewMenuOffsetWidth');
  equals(prop1,'custom-menu-item','Custom view class name should be custom-menu-item');
  equals(prop2,46,'Custom view menu off set width should be 46');
});
