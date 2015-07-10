/**
@module ember
@submodule ember-templates
*/

function Helper(helper) {
  this.helperFunction = helper;

  this.isHelper = true;
  this.isHTMLBars = true;
}

export default Helper;
