import { Renderer } from "ember-metal-views";

var renderer;

function MetalRenderer () {
  MetalRenderer.super.call(this);
}
MetalRenderer.super = Renderer;
MetalRenderer.prototype = Object.create(Renderer.prototype, {
  constructor: {
    value: MetalRenderer,
    enumerable: false,
    writable: true,
    configurable: true
  }
});

MetalRenderer.prototype.childViews = function (view) {
  return view.childViews;
};
MetalRenderer.prototype.willCreateElement = function(view) {
};
MetalRenderer.prototype.createElement = function (view) {
  var el;
  if (view.element) {
    el = view.element;
  } else {
    el = view.element = document.createElement(view.tagName || 'div');
  }
  var classNames = view.classNames;
  if (typeof classNames === 'string') {
    el.setAttribute('class', classNames);
  } else if (classNames && classNames.length) {
    if (classNames.length === 1) { // PERF: avoid join'ing unnecessarily
      el.setAttribute('class', classNames[0]);
    } else {
      el.setAttribute('class', classNames.join(' ')); // TODO: faster way to do this?
    }
  }
  var attributeBindings = view.attributeBindings;
  if (attributeBindings && attributeBindings.length) {
    for (var i=0,l=attributeBindings.length; i<l; i++) {
      var attributeBinding = attributeBindings[i];
      var parts = attributeBinding.split(':');
      el.setAttribute(parts[1], view[parts[0]]);
    }
  }
  if (view.childViews) {
    view._childViewsMorph = this._dom.createMorph(el, null, null, el);
  } else if (view.textContent) {
    el.textContent = view.textContent;
  } else if (view.innerHTML) {
    el.innerHTML = view.innerHTML;
  }
  return el;
};
MetalRenderer.prototype.didCreateElement = function(view) {
};
MetalRenderer.prototype.willInsertElement = function(view) {
  if (view.willInsertElement) {
    view.willInsertElement();
  }
};
MetalRenderer.prototype.didInsertElement = function(view) {
  if (view.didInsertElement) {
    view.didInsertElement();
  }
};

MetalRenderer.prototype.scheduleRender = function (renderer, render) {
  render.call(renderer);
};

export function testsFor(name, options) {
  QUnit.module(name, {
    setup: function() {
      renderer = new MetalRenderer();
      if (options && options.setup) { options.setup(renderer); }
    },
    teardown: function() {
      if (options && options.teardown) { options.teardown(renderer); }
      renderer = undefined;
    }
  });
}

export function subject() {
  return renderer;
}

export function equalHTML(element, expectedHTML, message) {
  var html;
  if (typeof element === 'string') {
    html = document.getElementById(element).innerHTML;
  } else {
    html = element.outerHTML;
  }

  var actualHTML = html.replace(/ id="[^"]+"/gmi, '');
  equal(actualHTML, expectedHTML, message || "HTML matches");
}

export function appendTo(view) {
  renderer.appendTo(view, document.getElementById('qunit-fixture'));
  return view.element;
}
