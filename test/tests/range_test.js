import { Range } from "htmlbars/runtime/range";

QUnit.module('Range tests');

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
}

test("Range#appendChild with parent element no siblings", function () {
  var frag = document.createDocumentFragment();
  var div = document.createElement('div');
  frag.appendChild(div);
  var range = new Range(div, null, null);
  var p = document.createElement('p');
  p.textContent = 'Hello';
  range.appendChild(p);

  equalHTML(frag, '<div><p>Hello</p></div>');
});
