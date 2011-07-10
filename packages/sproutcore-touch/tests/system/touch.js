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
    view = viewClass.create(SC.Gesturable, options);

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

  $('body').append('<div id="message0" style="overflow:scroll;height:40px;width:400px;z-index:100">a</div>');
  $('body').append('<div id="message1" style="overflow:scroll;height:40px;width:400px;z-index:100">a</div>');
  $('body').append('<div id="message2" style="overflow:scroll;height:40px;width:400px;z-index:100">b</div>');

  //var leftview = generateView({

    //elementId: 'leftContainerDiv',

    //touchStart: function(evt) {
      //this.$().css('background','limegreen');
      //$('#message0').text('Left Container start, touches length: '+evt.originalEvent.targetTouches.length+'<br>');
      //return false;
    //},

    //touchMove: function(evt) {
      ////$('#message1').prepend('Container move, target: '+evt.target.id+'<br>');
    //},

    //touchEnd: function(evt) {
      ////$('#message1').prepend('Container end, target: '+evt.target.id+'<br>');
      //$('#message0').text('');
      //this.$().css('background','red');
    //}

  //});

  //leftview.$().css({
    //position:'absolute',

    //top: 0,
    //bottom:0,

    //right:500,
    //width: 200,

    //background: 'red',
    //'-webkit-user-select': 'none'
  //}).text(leftview.elementId);

  //var myview = generateView({

    //elementId: 'containerDiv',
    //classNames: ['pinch'],

    //touchStart: function(evt) {
      //this.$().css('background','yellow');
      //$('#message1').text('Container start,<br> touches length: '+evt.originalEvent.targetTouches.length+'<br>');
      //return false;
    //},

    //touchMove: function(evt) {
      ////$('#message1').prepend('Container move, target: '+evt.target.id+'<br>');
    //},

    //touchEnd: function(evt) {
      ////$('#message1').prepend('Container end, target: '+evt.target.id+'<br>');
      //$('#message1').text('');
      //this.$().css('background','green');
    //},

    //touchCancel: function(evt) {
      ////$('#message1').prepend('Container end, target: '+evt.target.id+'<br>');
      //$('#message1').text('');
      //this.$().css('background','green');
    //}

  //});

  //myview.$().css({
    //width: 500,
    //background: 'green',
    //top: 0,
    //bottom:0,
    //right:0,
    //'-webkit-user-select': 'none',
    //position:'absolute'
  //}).text(myview.elementId);

  //var nestedView = generateNestedView(myview, {
    //elementId: 'nestedDiv',

    //touchStart: function(evt) {
      //this.$().css('background','blue');
      //$('#message2').text('Nested start, touches length: '+evt.originalEvent.targetTouches.length+'<br>');
    //},

    //touchMove: function(evt) {
      ////$('#message2').prepend('Nested move, target: '+evt.target.id+'<br>');
    //},

    //touchEnd: function(evt) {
      ////$('#message2').prepend('Nested end, target: '+evt.target.id+'<br>');
      //$('#message2').text('');
      //this.$().css('background','gray');
    //}

  //});

  //nestedView.$().css({
    //background: 'gray',
    //position: 'absolute',
    //top: 50,
    //left: 200,
    //right: 50,
    //bottom:50
  //}).text(nestedView.elementId);
  
});
