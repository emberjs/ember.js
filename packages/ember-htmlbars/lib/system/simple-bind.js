import run from "ember-metal/run_loop";
import SimpleBoundView from "ember-views/views/simple_bound_view";

export default function simpleBind(params, hash, options, env) {
  var lazyValue = params[0];

  var view = new SimpleBoundView(lazyValue, options.morph.escaped);

  view._parentView = this;
  view._morph = options.morph;
  this.appendChild(view);

  lazyValue.subscribe(this._wrapAsScheduled(function() {
    run.scheduleOnce('render', view, 'rerender');
  }));
}
