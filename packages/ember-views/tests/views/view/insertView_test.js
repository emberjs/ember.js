var view;
var get = Ember.get;

module("Ember.View#insertView", {
  setup: function() {
    view = Ember.View.create({
      elementId: 'testView'
    });

    Ember.run(function() {
      Ember.$("#qunit-fixture").html('<div id="layout"><div class="header" /><div class="footer" /></div>');
    });
  },
  teardowm: function() {
    if (view && !view.isDestroyed) {
      view.destroy();
    }
  }
});

test("insertView returns view", function() {
  var returned;

  Ember.run(function() {
    returned = view.insertView();
  });

  equal(returned, view, "insertView returns view");
});

test("insertView invokes append() when no callback is specified", function() {
  var appendCalled = false;

  view = Ember.View.extend({
    append: function() {
      appendCalled = true;
    }
  }).create();

  Ember.run(function() {
    view.insertView();
  });

  ok(appendCalled, "insertView invoked append() when no callback is given");
});

test("insertView invokes callback", function() {
  var callbackCalled;
  var thisInCallback;

  Ember.run(function() {
    view.insertView(function() {
      callbackCalled = true;
      thisInCallback = this;
    });
  });

  ok(callbackCalled, "callback called");
  ok(thisInCallback.$(), "this.$() inside callback is available");
  
  // check for a jQuery object via instanceof recommened in http://stackoverflow.com/a/487047/65542
  ok(thisInCallback.$() instanceof window.jQuery, "this.$() inside callback is a jQuery object");
});

test("insertView calls willInsertElement and didInsertElement callbacks", function() {
  var willInsertElementCalled = false;
  var willInsertElementCalledInChild = false;
  var didInsertElementCalled = false;

  var ViewWithCallback = Ember.View.extend({
    willInsertElement: function() {
      willInsertElementCalled = true;
    },
    didInsertElement: function() {
      didInsertElementCalled = true;
    },
    render: function(buffer) {
      this.appendChild(Ember.View.create({
        willInsertElement: function() {
          willInsertElementCalledInChild = true;
        }
      }));
    }
  });

  view = ViewWithCallback.create();

  Ember.run(function() {
    view.insertView();
  });

  ok(willInsertElementCalled, "willInsertElement called");
  ok(willInsertElementCalledInChild, "willInsertElement called in child");
  ok(didInsertElementCalled, "didInsertElement called");
});

var getId = function(htmlString) {
 return Ember.$(htmlString).attr('id');
};

var getClass = function(htmlString) {
 return Ember.$(htmlString).attr('class');
};

var testInsertion = function(methodName, target, assertion) {

 module("Ember.View#" + methodName, {
  setup: function() {
   view = Ember.View.create({
    elementId: 'testView'
   });
   
   Ember.run(function() {
    Ember.$("#qunit-fixture").html('<div id="layout"><div class="header" /><div class="footer" /></div>');
   });
  },
  teardowm: function() {
   if (view) {
    view.destroy();
   }
  }
 });


 test("adds view to specified target", function() {
  var childs = Ember.$("#qunit-fixture").children();
  equal(childs.length, 1, 'precond - qunit-fixture has one child');
  equal(getId(childs[0]), 'layout', 'precond - child has id "layout"');
  
  ok(!get(view, 'element'), "precond - should not have an element");
  ok(view[methodName], 'view has a method named ' + methodName);
  
  var returned;
  
  Ember.run(function() {
    // invoke given method on view
    returned = view[methodName](target);
  });
  
  equal(returned, view, methodName + ' returned view');
  
  var fixture = Ember.$('#qunit-fixture');
  
  // invoke callback
  assertion.call(this, fixture, fixture.children());
 });

  test("works with a View hierarchy", function() {
   view = Ember.ContainerView.extend({
    childViews: ['child'],
    child: Ember.View.extend({
     elementId: 'childViewId'
    })
   }).create();
 
   var childs = Ember.$("#qunit-fixture").children();
   equal(childs.length, 1, 'precond - qunit-fixture has one child');
   equal(getId(childs[0]), 'layout', 'precond - child has id "layout"');

   ok(!get(view, 'element'), "precond - should not have an element");
   ok(view[methodName], 'view has a method named ' + methodName);

   Ember.run(function() {
     // invoke given method on view
     view[methodName](target);
   });

   var fixture = Ember.$('#qunit-fixture');
   
   // invoke callback
   assertion.call(this, fixture, fixture.children());

   // test if containerView has a child with id 'childViewId'
   var containerView = Ember.$(document.body).find('#' + get(view, 'elementId'));
   equal(containerView.length, 1, 'containerView is added to document');
   
   var containerViewChildren = containerView.children();
   equal(containerViewChildren.length, 1, 'containerView has one child');
   equal(getId(containerViewChildren[0]), 'childViewId', 'child has correct id');
  });

};

testInsertion('append', null, function() {
  var children = Ember.$(document.body).children();
  var childrenCount = children.length;

  equal(getId(children[childrenCount - 1]), get(view, 'elementId'), 'view is added as last item on body');
});

testInsertion('appendTo', '#layout', function(fixture) {
  var layout = fixture.find('#layout').children();
  equal(layout.length, 3, '#layout has 3 childs');
  equal(getId(layout[2]), get(view, 'elementId'), 'last item is added view');
});

testInsertion('replaceWith', '#layout .header', function(fixture) {
  var layout = fixture.find('#layout').children();
  equal(layout.length, 2, '#layout has 2 childs');
  equal(getId(layout[0]), get(view, 'elementId'), 'testView replaces specified element');
});

testInsertion('replaceIn', '#layout .header', function(fixture, children) {
  equal(children.length, 1, 'there is one element');
  var refChilds = fixture.find('#layout .header').children();
  equal(refChilds.length, 1, '.header has 1 child');
  equal(getId(refChilds[0]), get(view, 'elementId'), 'content of .header is replaced with view');
});

testInsertion('insertBefore', '#layout .footer', function(fixture, children) {
  equal(children.length, 1, 'there is one element');
  var refChilds = fixture.find('#layout').children();
  equal(refChilds.length, 3, '#layout has 3 childs');
  equal(getClass(refChilds[0]), 'header', 'first element has class .header');
  equal(getId(refChilds[1]), get(view, 'elementId'), 'second element is inserted view');
  equal(getClass(refChilds[2]), 'footer', 'third element has class .footer');
});

testInsertion('insertAfter', '#layout .footer', function(fixture, children) {
  equal(children.length, 1, 'there is one element');
  var refChilds = fixture.find('#layout').children();
  equal(refChilds.length, 3, '#layout has 3 childs');
  equal(getClass(refChilds[0]), 'header', 'first element has class .header');
  equal(getClass(refChilds[1]), 'footer', 'second element has class .footer');
  equal(getId(refChilds[2]), get(view, 'elementId'), 'third element is inserted view');
});

testInsertion('prependTo', '#layout', function(fixture, children) {
  equal(children.length, 1, 'there is one element');
  var refChilds = fixture.find('#layout').children();
  equal(refChilds.length, 3, '#layout has 3 childs');
  equal(getId(refChilds[0]), get(view, 'elementId'), 'first element is inserted view');
  equal(getClass(refChilds[1]), 'header', 'second element has class .header');
  equal(getClass(refChilds[2]), 'footer', 'third element has class .footer');
});

testInsertion('prepend', null, function() {
  var children = Ember.$(document.body).children();

  var firstItem = children[0];
  var firstItemId = getId(firstItem);
  equal(firstItemId, get(view, 'elementId'), 'view is added as first item on body');
});