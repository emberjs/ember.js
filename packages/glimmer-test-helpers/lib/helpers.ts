import { tokenize } from "simple-html-tokenizer";
import { FIXME, forEach } from "glimmer-util";
import { SerializedTemplate } from 'glimmer-wire-format';
import { Environment, Template, Layout } from "glimmer-runtime";
import { TemplateSpec, compileSpec } from "glimmer-compiler";

interface CompileOptions {
  buildMeta?: FIXME<'currently does nothing'>;
  env: Environment;
}

export function compileRealSpec(string: string, options: CompileOptions): SerializedTemplate {
  return template(compileSpec(string, options));
}

/*
 * Compile a string into a template rendering function
 *
 * Example usage:
 *
 *     // Template is the hydration portion of the compiled template
 *     let template = compile("Howdy {{name}}");
 *
 *     // Template accepts three arguments:
 *     //
 *     //   1. A context object
 *     //   2. An env object
 *     //   3. A contextualElement (optional, document.body is the default)
 *     //
 *     // The env object *must* have at least these two properties:
 *     //
 *     //   1. `hooks` - Basic hooks for rendering a template
 *     //   2. `dom` - An instance of DOMHelper
 *     //
 *     import {hooks} from 'glimmer-runtime';
 *     import {DOMHelper} from 'morph';
 *     let context = {name: 'whatever'},
 *         env = {hooks: hooks, dom: new DOMHelper()},
 *         contextualElement = document.body;
 *     let domFragment = template(context, env, contextualElement);
 *
 * @method compile
 * @param {String} string An Glimmer template string
 * @param {Object} options A set of options to provide to the compiler
 * @return {Template} A function for rendering the template
 */
export function compile(string: string, options: CompileOptions): Template {
  return Template.fromSpec(compileRealSpec(string, options), options.env);
}

export function compileLayout(string: string, options: CompileOptions): Layout {
  return Template.layoutFromSpec(compileRealSpec(string, options), options.env);
}

/*
 * @method template
 * @param {TemplateSpec} templateSpec A precompiled template
 * @return {Template} A template spec string
 */
export function template(templateSpec: TemplateSpec): SerializedTemplate {
  return JSON.parse(templateSpec);
}

export function equalInnerHTML(fragment, html, msg?) {
  let actualHTML = normalizeInnerHTML(fragment.innerHTML);
  QUnit.push(actualHTML === html, actualHTML, html, msg);
}

export function equalHTML(node, html) {
  let fragment;
  if (!node.nodeType && node.length) {
    fragment = document.createDocumentFragment();
    while (node[0]) {
      fragment.appendChild(node[0]);
    }
  } else {
    fragment = node;
  }

  let div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  equalInnerHTML(div, html);
}

function generateTokens(divOrHTML) {
  let div;
  if (typeof divOrHTML === 'string') {
    div = document.createElement("div");
    div.innerHTML = divOrHTML;
  } else {
    div = divOrHTML;
  }

  return { tokens: tokenize(div.innerHTML), html: div.innerHTML };
}

export function equalTokens(fragment, html, message=null) {
  if (fragment.fragment) { fragment = fragment.fragment; }
  if (html.fragment) { html = html.fragment; }

  let fragTokens = generateTokens(fragment);
  let htmlTokens = generateTokens(html);

  function normalizeTokens(token) {
    if (token.type === 'StartTag') {
      token.attributes = token.attributes.sort(function(a, b) {
        if (a[0] > b[0]) { return 1; }
        if (a[0] < b[0]) { return -1; }
        return 0;
      });
    }
  }

  forEach(fragTokens.tokens, normalizeTokens);
  forEach(htmlTokens.tokens, normalizeTokens);

  // let msg = "Expected: " + htmlTokens.html + "; Actual: " + fragTokens.html;

  // if (message) { msg += " (" + message + ")"; }

  let equiv = QUnit.equiv(fragTokens.tokens, htmlTokens.tokens);

  if (equiv && fragTokens.html !== htmlTokens.html) {
    deepEqual(fragTokens.tokens, htmlTokens.tokens, message);
  } else {
    QUnit.push(QUnit.equiv(fragTokens.tokens, htmlTokens.tokens), fragTokens.html, htmlTokens.html, message);
  }

  // deepEqual(fragTokens.tokens, htmlTokens.tokens, msg);
}

// detect side-effects of cloning svg elements in IE9-11
let ieSVGInnerHTML = (function () {
  if (!document.createElementNS) {
    return false;
  }
  let div = document.createElement('div');
  let node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  div.appendChild(node);
  let clone = <HTMLDivElement>div.cloneNode(true);
  return clone.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" />';
})();

export function normalizeInnerHTML(actualHTML) {
  if (ieSVGInnerHTML) {
    // Replace `<svg xmlns="http://www.w3.org/2000/svg" height="50%" />` with `<svg height="50%"></svg>`, etc.
    // drop namespace attribute
    actualHTML = actualHTML.replace(/ xmlns="[^"]+"/, '');
    // replace self-closing elements
    actualHTML = actualHTML.replace(/<([^ >]+) [^\/>]*\/>/gi, function(tag, tagName) {
      return tag.slice(0, tag.length - 3) + '></' + tagName + '>';
    });
  }

  return actualHTML;
}

// detect weird IE8 checked element string
let checkedInput = document.createElement('input');
checkedInput.setAttribute('checked', 'checked');
let checkedInputString = checkedInput.outerHTML;
export function isCheckedInputHTML(element) {
  equal(element.outerHTML, checkedInputString);
}

// check which property has the node's text content
let textProperty = document.createElement('div').textContent === undefined ? 'innerText' : 'textContent';
export function getTextContent(el) {
  // textNode
  if (el.nodeType === 3) {
    return el.nodeValue;
  } else {
    return el[textProperty];
  }
}

export function strip(strings: string[]) {
  return strings[0].split('\n').map(s => s.trim()).join(' ');
}

export function stripTight(strings: string[]) {
  return strings[0].split('\n').map(s => s.trim()).join('');
}
