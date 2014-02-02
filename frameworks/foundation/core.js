
/**
  If true, then all SC.Controls can be focused when the
  user presses the tab key. Otherwise, only TextFieldViews
  will be focused.

  @type String
  @constant
*/
SC.FOCUS_ALL_CONTROLS = NO;

/*
  TODO [CC @ 1.5] Remove this deprecation warning eventually
*/
SC.ready(function() {
  var focus = SC.SAFARI_FOCUS_BEHAVIOR;
  if (focus !== null && focus !== undefined) {
    // @if (debug)
    SC.Logger.warn("SC.SAFARI_FOCUS_BEHAVIOR is deprecated. Please use SC.FOCUS_ALL_CONTROLS instead");
    // @endif
    SC.FOCUS_ALL_CONTROLS = SC.SAFARI_FOCUS_BEHAVIOR;
  }
});
