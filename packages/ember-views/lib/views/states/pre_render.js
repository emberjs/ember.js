import _default from 'ember-views/views/states/default';
import assign from 'ember-metal/assign';

/**
@module ember
@submodule ember-views
*/

let preRender = Object.create(_default);

assign(preRender, {
  legacyPropertyDidChange(view, key) {}
});

export default preRender;
