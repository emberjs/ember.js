import isEnabled from 'ember-metal/features';
import require from 'require';

/**
@module ember
@submodule ember-template-compiler
*/

/**
  Augments the default precompiled output of an HTMLBars template with
  additional information needed by Ember.

  @private
  @method template
  @param {Function} templateSpec This is the compiled HTMLBars template spec.
*/

let template;

if (isEnabled('ember-glimmer')) {
  let { Template } = require('glimmer-runtime');

  class Wrapper {
    static create(options) {
      return new this(options);
    }

    constructor({ env }) {
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

  template = function(json) {
    let spec = JSON.parse(json);

    return class extends Wrapper {
      constructor(options) {
        super(options);
        this.spec = spec;
      }
    };
  };
} else {
  let { wrap } = require('htmlbars-runtime/hooks');

  template = function(templateSpec) {
    if (!templateSpec.render) {
      templateSpec = wrap(templateSpec);
    }

    templateSpec.isTop = true;
    templateSpec.isMethod = false;

    return templateSpec;
  };
}

export default template;
