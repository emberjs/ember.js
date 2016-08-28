import assign from 'ember-metal/assign';
import _default from './states/default';
import preRender from './states/pre_render';
import hasElement from './states/has_element';
import inDOM from './states/in_dom';
import destroying from './states/destroying';

export function cloneStates(from) {
  let into = {};

  into._default = {};
  into.preRender = Object.create(into._default);
  into.destroying = Object.create(into._default);
  into.hasElement = Object.create(into._default);
  into.inDOM = Object.create(into.hasElement);

  for (let stateName in from) {
    if (!from.hasOwnProperty(stateName)) { continue; }
    assign(into[stateName], from[stateName]);
  }

  return into;
}

export let states = {
  _default: _default,
  preRender: preRender,
  inDOM: inDOM,
  hasElement: hasElement,
  destroying: destroying
};
