import { Template } from 'glimmer-runtime';
import { OWNER } from 'container';

class Wrapper {
  constructor(id, env, owner, spec) {
    if (spec.meta) {
      spec.meta.owner = owner;
    } else {
      spec.meta = {
        owner
      };
    }
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
    create(options) {
      let env = options.env;
      let owner = options[OWNER];

      return new Wrapper(id, env, owner, JSON.parse(json));
    }
  };
}
