// ========================================================================
// SproutCore -- JavaScript Application Framework
// ========================================================================

/**
  This View is used by Greenhouse when application is in design mode
  It darkens the area around the `rootDesigner`
*/
SC.RootDesignerHighLightView = SC.View.extend({

  /**
    The designer that owns this highlight
  */
  designer: null,

  classNames: 'high-light',

  render: function(context, firstTime) {
    var targetFrame = this.get('targetFrame');
    // render shadows
    context
    .begin('div').addClass(['top', 'cover']).addStyle({top: 0, height: targetFrame.y, left:0, right: 0}).end()
    .begin('div').addClass(['bottom', 'cover']).addStyle({top: targetFrame.y + targetFrame.height, bottom:0, left: 0, right:0}).end()
    .begin('div').addClass(['left', 'cover']).addStyle({left: 0, width: targetFrame.x, top: targetFrame.y, height: targetFrame.height}).end()
    .begin('div').addClass(['right', 'cover']).addStyle({left: targetFrame.x + targetFrame.width, right:0, top: targetFrame.y, height: targetFrame.height}).end();

  }

  // ..........................................................
  // EVENT HANDLING
  //

  // mouseDown: function(evt){
  //   return this._handle_click_event(evt);
  // },
  //
  // mouseUp: function(evt) {
  //   return this._handle_click_event(evt);
  // },
  //
  // mouseMoved: function(evt) {
  //   return this._handle_click_event(evt);
  // },
  //
  // mouseDragged: function(evt) {
  //   return this._handle_click_event(evt);
  // },
  //
  //
  // _handle_click_event: function(evt) {
  //   var d = this.designer,
  //       targetFrame = this.get('targetFrame');
  //   if(this.clickInside(targetFrame, evt) && d){
  //     return (d && d.mouseDown) ? d.mouseDown(evt) : null;
  //   }
  //   else if(d){
  //     d.resignRootDesigner();
  //     return YES;
  //   }
  //   else{
  //     return NO;
  //   }
  // }

});
