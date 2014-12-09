
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

    var keywordName     = this.templateHash.keywordName;
    var controllerName  = this.templateHash.controller;

    this._blockArguments = [this.lazyValue];

    if (controllerName) {
      var previousContext = this.previousContext;
      var controller = this.container.lookupFactory('controller:'+controllerName).create({
        parentController: previousContext,
        target: previousContext
      });

      this._generatedController = controller;

      if (this.preserveContext) {
        this._keywords[keywordName] = controller;
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
        this._keywords[keywordName] = this.lazyValue;
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
