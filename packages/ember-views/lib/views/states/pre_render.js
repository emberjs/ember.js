import _default from 'ember-views/views/states/default';
import merge from 'ember-metal/merge';

/**
@module ember
@submodule ember-views
*/

let preRender = Object.create(_default);

merge(preRender, {
  legacyPropertyDidChange(view, key) {}
});

export default preRender;
