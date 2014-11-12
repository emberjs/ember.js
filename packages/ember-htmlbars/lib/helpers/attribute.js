export function attribute(element, params, options) {
  var name = params[0];
  var value = params[1];

  value.subscribe(function(lazyValue) {
    element.setAttribute(name, lazyValue.value());
  });

  element.setAttribute(name, value.value());
}
