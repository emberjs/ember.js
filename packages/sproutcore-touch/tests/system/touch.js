// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;

var viewClass;
var views = [];
var containerView;

function generateView(options) {
  var view;
  
  viewClass = SC.View;

  SC.run(function(){
    view = viewClass.create(options);

    views.push(view);
    view.append();
  });

  return view;
}

function generateNestedView(parentView,options) {
  var nestedView = parentView.createChildView(SC.View, options);
 
  var buffer = nestedView.renderToBuffer().string();
 
  var fragment = SC.$(buffer);
  parentView.$().append(fragment);
 
  var childViews = get(parentView, 'childViews');
  childViews.push(nestedView);
    
  return nestedView;
}
module("touch",{
        
  setup: function() {
    application = SC.Application.create();
    application.ready();
  },

  teardown: function() {
    application.destroy();
  }
});
test('foobar',function() {

  var myview = generateView({

    elementId: 'touchTest2',
    classNames: ['pinch'],

    //mouseDown: function(evt) {
      //this.$().css('background','yellow');
      //return false;
    //},

    //mouseUp: function(evt) {
      //this.$().css('background','green');
      //return false;
    //},

    touchStart: function(evt) {
      this.$().css('background','yellow');

      this._startX = event.targetTouches[0].pageX;
      this._startY = event.targetTouches[0].pageY;
      return false;
    },

    touchMove: function(evt) {
      //console.log('touchmove');

      evt.preventDefault();

      var curX = event.targetTouches[0].pageX - this._startX;
      var curY = event.targetTouches[0].pageY - this._startY;

      //console.log('translate(' + curX + 'px, ' + curY + 'px)');

      event.targetTouches[0].target.style.webkitTransform =
        'translate(' + curX + 'px, ' + curY + 'px)';
    },

    touchEnd: function(evt) {
      //console.log('touchend');
      this._startX = 0;
      this._startY = 0;

      this.$().css('background','green');
      return false;
    }

  });

  myview.$().css({
    width: 400,
    height: 400,
    background: 'green',
    top: 200,
    right:0,
    '-webkit-user-select': 'none',
    position:'absolute'
  });
  
});
