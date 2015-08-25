/**
@module ember
@submodule ember-htmlbars
*/

import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import View from 'ember-views/views/view';

export default function appendTemplatedView(parentView, morph, viewClassOrInstance, props) {
  var viewProto;
  if (View.detectInstance(viewClassOrInstance)) {
    viewProto = viewClassOrInstance;
  } else {
    viewProto = viewClassOrInstance.proto();
  }

  assert(
    'You cannot provide a template block if you also specified a templateName',
    !props.template || (!get(props, 'templateName') && !get(viewProto, 'templateName'))
  );

  // We only want to override the `_context` computed property if there is
  // no specified controller. See View#_context for more information.

  var noControllerInProto = !viewProto.controller;
  if (viewProto.controller && viewProto.controller.isDescriptor) { noControllerInProto = true; }
  if (noControllerInProto &&
      !viewProto.controllerBinding &&
      !props.controller &&
      !props.controllerBinding) {
    props._context = get(parentView, 'context'); // TODO: is this right?!
  }

  props._morph = morph;

  return parentView.appendChild(viewClassOrInstance, props);
}
