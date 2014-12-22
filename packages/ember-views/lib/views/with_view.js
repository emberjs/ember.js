
/**
@module ember
@submodule ember-views
*/

import { set } from "ember-metal/property_set";
import { apply } from "ember-metal/utils";
import BoundView from "ember-views/views/bound_view";

export default BoundView.extend({
  init: function() {
    apply(this, this._super, arguments);

    var controllerName  = this.templateHash.controller;

    if (controllerName) {
      var previousContext = this.previousContext;
      var controller = this.container.lookupFactory('controller:'+controllerName).create({
        parentController: previousContext,
        target: previousContext
      });

      this._generatedController = controller;

      if (this.preserveContext) {
        this._blockArguments = [ controller ];
        this.lazyValue.subscribe(function(modelStream) {
          set(controller, 'model', modelStream.value());
        });
      } else {
        set(this, 'controller', controller);
        this.valueNormalizerFunc = function(result) {
          controller.set('model', result);
          return controller;
        };
      }

      set(controller, 'model', this.lazyValue.value());
    } else {
      if (this.preserveContext) {
        this._blockArguments = [ this.lazyValue ];
      }
    }
  },

  willDestroy: function() {
    this._super();

    if (this._generatedController) {
      this._generatedController.destroy();
    }
  }
});
