
/**
@module ember
@submodule ember-views
*/

import { set } from "ember-metal/property_set";
import { apply } from "ember-metal/utils";
import { _HandlebarsBoundView } from "ember-handlebars/views/handlebars_bound_view";

export default _HandlebarsBoundView.extend({
  init: function() {
    apply(this, this._super, arguments);

    var keywordName     = this.templateHash.keywordName;
    var controllerName  = this.templateHash.controller;

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
    }
  },

  willDestroy: function() {
    this._super();

    if (this._generatedController) {
      this._generatedController.destroy();
    }
  }
});
