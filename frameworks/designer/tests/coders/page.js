// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals module ok equals same test Sample */
var basic, baseTypes, bindingPage, testView, design;


module('SC.DesignCoder', {
  setup: function () {
    basic = SC.Page.design({});
    testView = SC.View.extend({});
    testView.Designer = SC.ViewDesigner.extend({
      designProperties: ['s', 'n', 'b', 'a', 'h', 'valueBinding']
    });
    
    
    baseTypes = SC.Page.create({
      needsDesigner: true,
      mainView: testView.design({s:'string',n:12,b:false,a:[1, 2, 3],h:{a:'b',c:'d'}})
    });
      
    bindingPage = SC.Page.create({
      number: 12,
      needsDesigner: true,
      mainView: testView.design({valueBinding: SC.Binding.from('.page.number')})//.create() //to get it to run on the binding itself...
    });
    
  },

  teardown: function () {
  }
});

test('Verify basic page file encoding', function () {
  design = SC.DesignCoder.encode(basic);
  equals(design.trim(), 'SC.Page.design({})', 'basic page encoded');
});

test('Verify view in page encoding', function () {
  baseTypes.awake();
  design = SC.DesignCoder.encode(baseTypes);
  equals(design.trim(),'SC.Page.design({mainView: SC.View.design({s: "string",n: 12,b: false,a: [1,2,3],h: {"a": "b","c": "d"}})})', 'basic types encoded');  
});

test('Verify binding in page encoding', function () {
  SC.RunLoop.begin();
  bindingPage.awake();
  bindingPage.get('mainView');
  SC.RunLoop.end();

  design = SC.DesignCoder.encode(bindingPage);
  equals(design.trim(),'SC.Page.design({mainView: SC.View.design({valueBinding: SC.Binding.from(\'.page.number\')})})', 'binding types encoded');  
});
