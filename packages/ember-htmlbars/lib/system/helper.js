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

  this.isHTMLBars = true;
}

Helper.prototype = {
  preprocessArguments: function() { }
};

export default Helper;
