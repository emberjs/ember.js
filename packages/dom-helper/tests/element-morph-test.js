import DOMHelper from "../dom-helper";

var dom;
QUnit.module('DOM Helper: ElementMorph', {
  beforeEach: function() {
    dom = new DOMHelper();
  },

  afterEach: function() {
    dom = null;
  }
});

test('contains a clear method', function(){
  expect(0);

  var el = dom.createElement('div');
  var node = dom.createElementMorph(el);

  node.clear();
});

test('resets element and dom on destroy', function(){
  expect(2);

  var el = dom.createElement('div');
  var node = dom.createElementMorph(el);

  node.destroy();

  equal(node.element, null, 'element was reset to null');
  equal(node.dom, null, 'dom was reset to null');
});
