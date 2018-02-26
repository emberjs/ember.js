import { Mixin, alias } from 'ember-metal';
import { deprecatingAlias } from '../computed/computed_macros';
import ActionHandler from './action_handler';

/**
  @class ControllerMixin
  @namespace Ember
  @uses Ember.ActionHandler
  @private
*/
export default Mixin.create(ActionHandler, {
  /* ducktype as a controller */
  isController: true,

  /**
    The object to which actions from the view should be sent.

    For example, when a Handlebars template uses the `{{action}}` helper,
    it will attempt to send the action to the view's controller's `target`.

    By default, the value of the target property is set to the router, and
    is injected when a controller is instantiated. This injection is applied
    as part of the application's initialization process. In most cases the
    `target` property will automatically be set to the logical consumer of
    actions for the controller.

    @property target
    @default null
    @public
  */
  target: null,

  store: null,

  /**
    The controller's current model. When retrieving or modifying a controller's
    model, this property should be used instead of the `content` property.

    @property model
    @public
  */
  model: null,

  /**
    @private
  */
  content: deprecatingAlias('model', {
    id: 'ember-runtime.controller.content-alias',
    until: '2.17.0',
    url: 'https://emberjs.com/deprecations/v2.x/#toc_controller-content-alias'
  })
});
