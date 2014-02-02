// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start Q$*/

var pane, view , view1, view2, view3;
module("SC.SelectFieldView",{
  setup: function() {
    SC.RunLoop.begin();
    pane = SC.MainPane.create({
      objs : ["Apple","Sproutcore 1.0","Development","Charles"],
      selectedValue: "Apple",
      childViews: [
        SC.SelectFieldView.extend({
          objects: [1,6,11,2,8]
        }),
        SC.SelectFieldView.extend({
          objects: ["Apple","Sproutcore 1.0","Development","Charles"]
        }),
        SC.SelectFieldView.extend({
          objectsBinding: '*owner.objs',
          valueBinding: '*owner.selectedValue' 
        }),
        SC.SelectFieldView.extend({
          objectsBinding: '*owner.objs',
          valueBinding: '*owner.selectedValue',
          valueKey: 'title',
          nameKey: 'title',
          sortKey: 'pos' 
        })
        
        
      ]  
    });
    pane.append(); // make sure there is a layer...
    SC.RunLoop.end();
  
    view = pane.childViews[0] ;
    view1 = pane.childViews[1] ;
    view2 = pane.childViews[2] ;
    view3 = pane.childViews[3] ;
  },
  
  teardown: function() {
    pane.remove();
    pane = view = null ;
  }
});

test("renders a select field input tag with appropriate attributes", function() {
  equals(view.get('tagName'), 'select', 'should have type as text');  
  var q = Q$('select', view.get('layer'));
  equals(view.$().attr('id'), SC.guidFor(view), 'should have id as view_guid');
});

test("select component with options", function() {
   equals(5,view.objects.length,'The select component should have 5 options');
  equals(null,view.nameKey,'the select should not have any name key');
  equals(null,view.valueKey,'the select should not have any value key');
});

test("sortObjects() sorts the options of the select component", function() {  
  var obj = view.objects;
  view.objects = view.sortObjects(obj);

  equals(1,obj.get(0),'should be the first element');
  equals(2,obj.get(1),'should be the second element');
  equals(6,obj.get(2),'should be the third element');
  equals(8,obj.get(3),'should be the forth element');
  equals(11,obj.get(4),'should be the fifth element');
});

test("rebuildMenu() populates the select component with new data", function() {  
  var newObj = ['Hai,','how','are','you?'];
  view1.objects = newObj;
  var obj = view1.objects;
  equals('Hai,',obj.get(0),'should be the first element');
  equals('how',obj.get(1),'should be the second element');
  equals('are',obj.get(2),'should be the third element');
  equals('you?',obj.get(3),'should be the forth element');
});

test("isEnabled=NO should add disabled class", function() {
  SC.RunLoop.begin();
  view.set('isEnabled', NO);
  SC.RunLoop.end();  
  ok(view.$().hasClass('disabled'), 'should have disabled class');
});

test("objects should change on changing the binding", function() {
  SC.RunLoop.begin();
  var newObjects = ['Test1','Test2'] ;
  pane.set('objs', newObjects);
  SC.RunLoop.end();  
  var objects = view2.objects ;
  newObjects = pane.objs ;
  ok(objects===newObjects, 'the objects should be same');
});


test("selectedValue shouldn't have st string attached to it", function() {
  SC.RunLoop.begin();
  var newObjects = ['Test1','Test2'] ;
  pane.set('objs', newObjects);
  SC.RunLoop.end();  
  SC.RunLoop.begin();
  pane.set('selectedValue', 'Test1');
  SC.RunLoop.end();  
  var selectedValue = view2.getFieldValue() ;
  equals(selectedValue,'Test1', 'the new Value is ');
  
  
  SC.RunLoop.begin();
  var newObjects2 =[{pos: 1,title:'US/Pacific'}, 
  {pos: 2, title:'America/Vancouver'}, 
  {pos: 3, title:'Canada/Mountain'},
  {pos: 4, title:'Other...'}];
  pane.set('objs', newObjects2);
  SC.RunLoop.end();  
  SC.RunLoop.begin();
  pane.set('selectedValue', 'America/Vancouver');
  SC.RunLoop.end();  
  selectedValue = view3.getFieldValue() ;
  equals(selectedValue,'America/Vancouver', 'the new Value is ');
  
});

test("changing the selected item in the select field appropriately notifies that the value has changed", function() {
  SC.RunLoop.begin();
  var newObjects2 =[{pos: 1,title:'US/Pacific'}, 
  {pos: 2, title:'America/Vancouver'}, 
  {pos: 3, title:'Canada/Mountain'},
  {pos: 4, title:'Other...'}], elm;
  pane.set('objs', newObjects2);
  SC.RunLoop.end();  
  SC.RunLoop.begin();
  pane.set('selectedValue', 'America/Vancouver');
  SC.RunLoop.end();  
  selectedValue = view3.getFieldValue() ;
  equals(selectedValue,'America/Vancouver', 'the new Value is ');
  
  
  // Changing the selection in the box to 'Canada/Mountain' programmatically
  SC.RunLoop.begin();
  elm = view3.$input().get(0);
  elm.childNodes[2].selected = true;
  SC.RunLoop.end();
  
  // Trigger observer!
  SC.RunLoop.begin();
  SC.Event.trigger(elm, "change");
  SC.RunLoop.end();

  // See if the value propagated to the controller.
  SC.RunLoop.begin();
  selectedValue = pane.get('selectedValue') ;
  SC.RunLoop.end();  
  equals(selectedValue,'Canada/Mountain', 'the bound Value is ');
});
