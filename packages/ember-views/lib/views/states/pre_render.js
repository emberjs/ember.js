import _default from "ember-views/views/states/default";
import create from 'ember-metal/platform/create';
import merge from "ember-metal/merge";

/**
@module ember
@submodule ember-views
*/

let preRender = create(_default);

merge(preRender, {
  legacyAttrWillChange(view, key) {},
  legacyAttrDidChange(view, key) {}
});

export default preRender;
