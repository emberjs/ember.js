function querySelector(selector) {
  return document.querySelector(selector);
}

function createElement(tagName) {
  return document.createElement(tagName);
}

function addEventListener(element, name, fn, capture) {
  return element.addEventListener(name, fn, capture);
}

function removeEventListener(element, name, fn) {
  return element.addEventListener(name, fn);
}

export { querySelector, createElement, addEventListener, removeEventListener };