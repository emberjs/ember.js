import run from "ember-metal/run_loop";

export function attributeHelper(params, hash, options, env) {
  var dom = env.dom;
  var name = params[0];
  var value = params[1];

  var isDirty, lastRenderedValue;

  value.subscribe(function(lazyValue) {
    isDirty = true;

    run.schedule('render', this, function() {
      var value = lazyValue.value();

      if (isDirty) {
        isDirty = false;
        if (value !== lastRenderedValue) {
          lastRenderedValue = value;
          dom.setAttribute(options.element, name, value);
        }
      }
    });
  });

  lastRenderedValue = value.value();

  dom.setAttribute(options.element, name, lastRenderedValue);
}
