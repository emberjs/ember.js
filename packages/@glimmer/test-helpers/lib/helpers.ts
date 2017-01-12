import { tokenize } from "simple-html-tokenizer";
import { Environment, Template, Layout, templateFactory } from "@glimmer/runtime";
import { precompile, PrecompileOptions } from "@glimmer/compiler";

// For Phantom
function toObject(val) {
  if (val === null || val === undefined) {
    throw new TypeError('Object.assign cannot be called with null or undefined');
  }

  return Object(val);
}

if (typeof Object.assign !== 'function') {
  Object.assign = function(target, source) {
    let from;
    let to = toObject(target);
    let symbols;

    for (let s = 1; s < arguments.length; s++) {
      from = Object(arguments[s]);

      for (let key in from) {
        if (Object.prototype.hasOwnProperty.call(from, key)) {
          to[key] = from[key];
        }
      }

      if (Object.getOwnPropertySymbols) {
        symbols = Object.getOwnPropertySymbols(from);
        for (let i = 0; i < symbols.length; i++) {
          if (Object.prototype.propertyIsEnumerable.call(from, symbols[i])) {
            to[symbols[i]] = from[symbols[i]];
          }
        }
      }
    }

    return to;
  };
}

export const assign = Object.assign;

function isMarker(node) {
  const TextNode = (<any>window).Text;
  const Comment = (<any>window).Comment;

  if (node instanceof Comment && node.textContent === '') {
    return true;
  }

  if (node instanceof TextNode && node.textContent === '') {
    return true;
  }

  return false;
}

export interface TestCompileOptions<T> extends PrecompileOptions<T> {
  env: Environment;
}

export function compile<T>(string: string, options: TestCompileOptions<T>): Template<T> {
  let js = precompile(string, options);
  let factory = templateFactory<T>(JSON.parse(js));
  return factory.create(options.env);
}

export function compileLayout<T>(string: string, options: TestCompileOptions<T>): Layout {
  return compile(string, options).asLayout();
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

  fragTokens.tokens.forEach(normalizeTokens);
  htmlTokens.tokens.forEach(normalizeTokens);

  // let msg = "Expected: " + htmlTokens.html + "; Actual: " + fragTokens.html;

  // if (message) { msg += " (" + message + ")"; }

  let equiv = QUnit.equiv(fragTokens.tokens, htmlTokens.tokens);

  if (equiv && fragTokens.html !== htmlTokens.html) {
    QUnit.deepEqual(fragTokens.tokens, htmlTokens.tokens, message);
  } else {
    QUnit.push(QUnit.equiv(fragTokens.tokens, htmlTokens.tokens), fragTokens.html, htmlTokens.html, message);
  }

  // deepEqual(fragTokens.tokens, htmlTokens.tokens, msg);
}

export function generateSnapshot(element) {
  let snapshot = [];
  let node = element.firstChild;

  while (node) {
    if (!isMarker(node)) {
      snapshot.push(node);
    }
    node = node.nextSibling;
  }

  return snapshot;
}

export function equalSnapshots(a, b) {
  QUnit.strictEqual(a.length, b.length, 'Same number of nodes');
  for (let i = 0; i < b.length; i++) {
    QUnit.strictEqual(a[i], b[i], 'Nodes are the same');
  }
}

// detect side-effects of cloning svg elements in IE9-11
let ieSVGInnerHTML = (function () {
  if (typeof document === 'undefined' || !document.createElementNS) {
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

let isCheckedInputHTML;

if (typeof document === 'undefined') {
  isCheckedInputHTML = function(element) {
  };
} else {
  // detect weird IE8 checked element string
  let checkedInput = document.createElement('input');
  checkedInput.setAttribute('checked', 'checked');
  let checkedInputString = checkedInput.outerHTML;

  isCheckedInputHTML = function(element) {
    QUnit.equal(element.outerHTML, checkedInputString);
  };
}

export { isCheckedInputHTML };

// check which property has the node's text content
let textProperty = typeof document === 'object' && document.createElement('div').textContent === undefined ? 'innerText' : 'textContent';
export function getTextContent(el) {
  // textNode
  if (el.nodeType === 3) {
    return el.nodeValue;
  } else {
    return el[textProperty];
  }
}

export function strip(strings: TemplateStringsArray) {
  return strings[0].split('\n').map(s => s.trim()).join(' ');
}

export function stripTight(strings: TemplateStringsArray) {
  return strings[0].split('\n').map(s => s.trim()).join('');
}

export function trimLines(strings: TemplateStringsArray) {
  return strings[0].trim().split('\n').map(s => s.trim()).join('\n');
}
