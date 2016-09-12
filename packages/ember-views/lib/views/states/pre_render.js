import { assign } from 'ember-utils';
import _default from './default';

/**
@module ember
@submodule ember-views
*/

let preRender = Object.create(_default);

assign(preRender, {
  legacyPropertyDidChange(view, key) {}
});

export default preRender;
