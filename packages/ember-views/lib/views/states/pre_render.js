import _default from './default';
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
