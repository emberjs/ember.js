import DOMHelper from "dom-helper";
import environment from "ember-metal/environment";
import RenderBuffer from "ember-views/system/render_buffer";
import run from "ember-metal/run_loop";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import {
  _instrumentStart,
  subscribers
} from "ember-metal/instrumentation";

var domHelper = environment.hasDOM ? new DOMHelper() : null;

function Renderer(_helper, _destinedForDOM) {
  this._dom = _helper || domHelper;
}

Renderer.prototype.renderTopLevelView =
  function Renderer_renderTopLevelView(view, morph) {
    view.ownerView = morph.state.view = view;
    view.renderNode = morph;

    var contentMorph = this.contentMorphForView(view, morph);

    var template = get(view, 'layout') || get(view, 'template');

    if (template) {
      var result = view.renderTemplate(view, contentMorph.contextualElement, template, contentMorph);

      view.lastResult = morph.lastResult = result;
      window.lastMorph = morph;

      this.dispatchLifecycleHooks(view.env);
    }
  };

Renderer.prototype.revalidateTopLevelView =
  function Renderer_revalidateTopLevelView(view) {
    view.renderNode.lastResult.revalidate();
    this.dispatchLifecycleHooks(view.env);
  };

Renderer.prototype.dispatchLifecycleHooks =
  function Renderer_dispatchLifecycleHooks(env) {
    var lifecycleHooks = env.lifecycleHooks;
    var i, hook;

    for (i=0; i<lifecycleHooks.length; i++) {
      hook = lifecycleHooks[i];

      switch (hook.type) {
        case 'didInsertElement': this.didInsertElement(hook.view); break;
        case 'didUpdate': this.didUpdate(hook.view); break;
      }

      this.didRender(hook.view);
    }

    env.lifecycleHooks = [];
  };

// This entry point is called from top-level `view.appendTo`
Renderer.prototype.appendTo =
  function Renderer_appendTo(view, target) {
    var morph = this._dom.appendMorph(target);
    morph.ownerNode = morph;
    run.scheduleOnce('render', this, this.renderTopLevelView, view, morph);
  };

// This entry point is called by the `#view` keyword in templates
Renderer.prototype.contentMorphForView =
  function Renderer_contentMorphForView(view, morph, options) {
    return contentMorphForView(view, morph, this._dom, options);
  };

Renderer.prototype.willCreateElement = function (view) {
  if (subscribers.length && view.instrumentDetails) {
    view._instrumentEnd = _instrumentStart('render.'+view.instrumentName, function viewInstrumentDetails() {
      var details = {};
      view.instrumentDetails(details);
      return details;
    });
  }
  if (view._transitionTo) {
    view._transitionTo('inBuffer');
  }
}; // inBuffer

Renderer.prototype.didCreateElement = function (view, element) {
  if (element) {
    view.element = element;
  }

  if (view._transitionTo) {
    view._transitionTo('hasElement');
  }
  if (view._instrumentEnd) {
    view._instrumentEnd();
  }
}; // hasElement

Renderer.prototype.willInsertElement = function (view) {
  if (view.trigger) { view.trigger('willInsertElement'); }
}; // will place into DOM

Renderer.prototype.setAttrs = function (view, attrs) {
  set(view, 'attrs', attrs);
}; // set attrs the first time

Renderer.prototype.didInsertElement = function (view) {
  if (view._transitionTo) {
    view._transitionTo('inDOM');
  }

  if (view.trigger) { view.trigger('didInsertElement'); }
}; // inDOM // placed into DOM

Renderer.prototype.didUpdate = function (view) {
  if (view.trigger) { view.trigger('didUpdate'); }
};

Renderer.prototype.didRender = function (view) {
  if (view.trigger) { view.trigger('didRender'); }
};

Renderer.prototype.updateAttrs = function (view, attrs) {
  if (view.willReceiveAttrs) {
    view.willReceiveAttrs(attrs);
  }

  set(view, 'attrs', attrs);
}; // setting new attrs

Renderer.prototype.willUpdate = function (view, attrs) {
  if (view.willUpdate) {
    view.willUpdate(attrs);
  }
};

Renderer.prototype.willRender = function (view) {
  if (view.willRender) {
    view.willRender();
  }
};

Renderer.prototype.willRemoveElement = function (view) {};

Renderer.prototype.willDestroyElement = function (view) {
  if (view._willDestroyElement) {
    view._willDestroyElement();
  }
  if (view.trigger) {
    view.trigger('willDestroyElement');
    view.trigger('willClearRender');
  }
};

Renderer.prototype.didDestroyElement = function (view) {
  view.element = null;
  if (view._transitionTo) {
    view._transitionTo('preRender');
  }
}; // element destroyed so view.destroy shouldn't try to remove it removedFromDOM

export default Renderer;

function contentMorphForView(view, morph, dom, options) {
  var buffer = new RenderBuffer(dom);
  var contextualElement = morph.contextualElement;
  var contentMorph;

  if (options && options.class) {
    view.classNames.push(options.class);
  }

  if (options && options.id) {
    view.elementId = options.id;
  }

  view.renderer.willCreateElement(view);

  var tagName = view.tagName;

  if (tagName !== null && typeof tagName === 'object' && tagName.isDescriptor) {
    tagName = get(view, 'tagName');
    Ember.deprecate('In the future using a computed property to define tagName will not be permitted. That value will be respected, but changing it will not update the element.', !tagName);
  }

  var classNameBindings = view.classNameBindings;
  var taglessViewWithClassBindings = tagName === '' && (classNameBindings && classNameBindings.length > 0);

  if (tagName === null || tagName === undefined) {
    tagName = 'div';
  }

  Ember.assert('You cannot use `classNameBindings` on a tag-less view: ' + view.toString(), !taglessViewWithClassBindings);

  buffer.reset(tagName, contextualElement);

  var element;

  if (tagName !== '') {
    if (view.applyAttributesToBuffer) {
      view.applyAttributesToBuffer(buffer);
    }
    element = buffer.generateElement();
  }

  if (element && element.nodeType === 1) {
    view.element = element;
    contentMorph = dom.insertMorphBefore(element, null);
    contentMorph.ownerNode = morph.ownerNode;
    morph.childNodes = [contentMorph];
    morph.setContent(element);
  } else {
    contentMorph = morph;
  }

  view.renderer.didCreateElement(view);

  return contentMorph;
}
