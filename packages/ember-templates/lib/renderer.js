import isEnabled from 'ember-metal/features';
import require from 'require';

export const InteractiveRenderer = (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/renderer').InteractiveRenderer;
  } else {
    return require('ember-htmlbars/renderer').InteractiveRenderer;
  }
}());

export const InertRenderer = (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/renderer').InertRenderer;
  } else {
    return require('ember-htmlbars/renderer').InertRenderer;
  }
}());

export const Renderer = (function () {
  if (isEnabled('ember-glimmer')) {
    return require('ember-glimmer/renderer').Renderer;
  } else {
    return require('ember-htmlbars/renderer').Renderer;
  }
}());
