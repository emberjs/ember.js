import EmberObject from 'ember-runtime/system/object';
import { Template } from 'glimmer-runtime';

const Wrapper = EmberObject.extend({
  _entryPoint: null,
  _layout: null,

  asEntryPoint() {
    if (!this._entryPoint) {
      let { spec, env } = this;
      this._entryPoint = Template.fromSpec(spec, env);
    }

    return this._entryPoint;
  },

  asLayout() {
    if (!this._layout) {
      let { spec, env } = this;
      this._layout = Template.layoutFromSpec(spec, env);
    }

    return this._layout;
  }
});

export default function template(json) {
  return Wrapper.extend({ spec: JSON.parse(json) });
}
