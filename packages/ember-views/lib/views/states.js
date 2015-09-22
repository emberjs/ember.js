import assign from 'ember-metal/assign';
import _default from 'ember-views/views/states/default';
import preRender from 'ember-views/views/states/pre_render';
import hasElement from 'ember-views/views/states/has_element';
import inDOM from 'ember-views/views/states/in_dom';
import destroying from 'ember-views/views/states/destroying';

export function cloneStates(from) {
  var into = {};

  into._default = {};
  into.preRender = Object.create(into._default);
  into.destroying = Object.create(into._default);
  into.hasElement = Object.create(into._default);
  into.inDOM = Object.create(into.hasElement);

  for (var stateName in from) {
    if (!from.hasOwnProperty(stateName)) { continue; }
    assign(into[stateName], from[stateName]);
  }

  return into;
}

export var states = {
  _default: _default,
  preRender: preRender,
  inDOM: inDOM,
  hasElement: hasElement,
  destroying: destroying
};
