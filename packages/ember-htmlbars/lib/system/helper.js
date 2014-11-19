/**
@module ember
@submodule ember-htmlbars
*/

/**
  @class Helper
  @namespace Ember.HTMLBars
*/
function Helper(helper, preprocessArguments) {
  this.helperFunction = helper;

  if (preprocessArguments) {
    this.preprocessArguments = preprocessArguments;
  }
}

Helper.prototype = {
  preprocessArguments: function() { },
  isHTMLBars: true
};

export default Helper;
