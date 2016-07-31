import { Template } from 'glimmer-runtime';

class Wrapper {
  constructor(id, env, spec) {
    this.id = id;
    this.env = env;
    this.spec = spec;
    this._entryPoint = null;
    this._layout = null;
  }

  asEntryPoint() {
    if (!this._entryPoint) {
      let { spec, env } = this;
      this._entryPoint = Template.fromSpec(spec, env);
    }
    return this._entryPoint;
  }

  asLayout() {
    if (!this._layout) {
      let { spec, env } = this;
      this._layout = Template.layoutFromSpec(spec, env);
    }
    return this._layout;
  }
}

let templateId = 0;
export default function template(json) {
  let id = ++templateId;
  return {
    id,
    create({ env }) {
      return new Wrapper(id, env, JSON.parse(json));
    }
  };
}
