import { Template } from 'glimmer-runtime';

class Wrapper {
  static create(options) {
    return new this(options);
  }

  constructor({ env }, id) {
    this.id = id;
    this._entryPoint = null;
    this._layout = null;
    this.env = env;
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
const template = function(json) {
  let id = templateId++;
  let Factory = class extends Wrapper {
    constructor(options) {
      super(options, id);
      this.spec = JSON.parse(json);
    }
  };
  Factory.id = id;
  return Factory;
};

export default template;
