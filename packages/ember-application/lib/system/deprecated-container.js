function DeprecatedContainer(container) {
  this._container = container;
}

DeprecatedContainer.deprecate = function(method) {
  return function() {
    var container = this._container;

    Ember.deprecate('Using the defaultContainer is no longer supported. [defaultContainer#' + method + '] see: http://git.io/EKPpnA', false);
    return container[method].apply(container, arguments);
  };
};

DeprecatedContainer.prototype = {
  _container: null,
  lookup: DeprecatedContainer.deprecate('lookup'),
  resolve: DeprecatedContainer.deprecate('resolve'),
  register: DeprecatedContainer.deprecate('register')
};

export default DeprecatedContainer;
