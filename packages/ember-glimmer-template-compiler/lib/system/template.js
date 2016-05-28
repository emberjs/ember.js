import { Template } from 'glimmer-runtime';

let templateId = 0;

class Wrapper {
  static create(options) {
    return new this(options);
  }

  constructor({ env }) {
    this.id = templateId++;
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

const template = function(json) {
  return class extends Wrapper {
    constructor(options) {
      super(options);
      this.spec = JSON.parse(json);
    }
  };
};

export default template;
