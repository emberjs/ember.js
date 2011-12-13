(function() {
  var parentView, childView, childViews;
  var get = Ember.get;

  module('tests/views/view/child_views_tests.js', {
    setup: function() {
      parentView = Ember.View.create({
        render: function(buffer) {
          buffer.push('Em');
          this.appendChild(childView);
        }
      });

      childView = Ember.View.create({
        template: function() { return 'ber'; }
      });
    },

    teardown: function() {
      parentView.destroy();
      childView.destroy();
      childViews = null;
    }
  });

  // no parent element, buffer, no element
  // parent element

  // no parent element, no buffer, no element
  test("should render an inserted child view when the child is inserted before a DOM element is created", function() {
    Ember.run(function() {
      parentView.append();
    });

    equals(parentView.$().text(), 'Ember', 'renders the child view after the parent view');
  });

  test("should not duplicate childViews when rerendering in buffer", function() {

    var inner = Ember.View.create({
      template: function() { return ''; }
    });

     var inner2 = Ember.View.create({
       template: function() { return ''; }
     });

    var middle = Ember.View.create({
      render: function(buffer) {
        this.appendChild(inner);
        this.appendChild(inner2);
      }
    });

    var outer = Ember.View.create({
      render: function(buffer) {
        this.appendChild(middle);
      }
    });

    Ember.run(function() {
      outer.renderToBuffer();
    });

    equals(middle.getPath('childViews.length'), 2);

    Ember.run(function() {
      middle.rerender();
    });

    equals(middle.getPath('childViews.length'), 2);

  });

})();
