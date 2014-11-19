/**
@module ember
@submodule ember-htmlbars
*/

/**
  @class Helper
  @namespace Ember.HTMLBars
*/
function Helper(helper, preprocessArguments) {
  this.isHTMLBars = true;
  this.helperFunction = helper;
  this.preprocessArguments = preprocessArguments || function() { };
}


export default Helper;
