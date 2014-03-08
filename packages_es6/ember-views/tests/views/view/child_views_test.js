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
      Ember.run(function() {
        parentView.destroy();
        childView.destroy();
      });

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

    equal(parentView.$().text(), 'Ember', 'renders the child view after the parent view');
  });

  test("should not duplicate childViews when rerendering in buffer", function() {

    var Inner = Ember.View.extend({
      template: function() { return ''; }
    });

    var Inner2 = Ember.View.extend({
      template: function() { return ''; }
    });

    var Middle = Ember.View.extend({
      render: function(buffer) {
        this.appendChild(Inner);
        this.appendChild(Inner2);
      }
    });

    var outer = Ember.View.create({
      render: function(buffer) {
        this.middle = this.appendChild(Middle);
      }
    });

    Ember.run(function() {
      outer.renderToBuffer();
    });

    equal(outer.get('middle.childViews.length'), 2, 'precond middle has 2 child views rendered to buffer');

    raises(function() {
      Ember.run(function() {
        outer.middle.rerender();
      });
    }, /Something you did caused a view to re-render after it rendered but before it was inserted into the DOM./);

    equal(outer.get('middle.childViews.length'), 2, 'middle has 2 child views rendered to buffer');

    Ember.run(function() {
      outer.destroy();
    });
  });

})();
