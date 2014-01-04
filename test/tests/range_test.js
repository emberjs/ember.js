import { Range } from "htmlbars/runtime/range";

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
}

var parents = [
  {
    name: 'with parent as an element',
    create: function (frag) {
      var parent = document.createElement('div');
      frag.appendChild(parent);
      return parent;
    },
    startHTML: '<div>',
    endHTML: '</div>'
  },
  {
    name: 'with parent as a fragment',
    create: function (frag) { return frag; },
    startHTML: '',
    endHTML: ''
  }
];

var starts = [
  {
    name: 'with sibling before',
    create: function (parent) {
      var start = document.createTextNode('Some text before ');
      parent.appendChild(start);
      return start;
    },
    HTML: 'Some text before '
  },
  {
    name: 'with no sibling before',
    create: function (parent) {
      return null;
    },
    HTML: ''
  }
];

var ends = [
  {
    name: 'and sibling after',
    create: function (parent) {
      var end = document.createTextNode(' some text after.');
      parent.appendChild(end);
      return end;
    },
    HTML: ' some text after.'
  },
  {
    name: 'and no sibling after',
    create: function (parent) {
      return null;
    },
    HTML: ''
  }
];

var contents = [
  {
    name: 'with an empty Range',
    create: function (parent) { },
    HTML: ''
  },
  {
    name: 'with some paragraphs in the Range',
    create: function (parent) {
      var p;
      p = document.createElement('p');
      p.textContent = 'a';
      parent.appendChild(p);
      p = document.createElement('p');
      p.textContent = 'b';
      parent.appendChild(p);
      p = document.createElement('p');
      p.textContent = 'c';
      parent.appendChild(p);
    },
    HTML: '<p>a</p><p>b</p><p>c</p>'
  }
];

function createCombinatorialTest(factory) {
  QUnit.module('Range');

  test('appendChild '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      p = document.createElement('p'),
      range, html;

    p.textContent = 'appended';

    range = new Range(parent, start, end);

    range.appendChild(p);

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           '<p>appended</p>' +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);
  });

  test('appendText '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      range, html;

    range = new Range(parent, start, end);

    range.appendText('appended text');

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           'appended text' +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);
  });

  test('appendHTML '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      range, html;

    range = new Range(parent, start, end);

    range.appendHTML('<p>A</p><p>B</p><p>C</p>');

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           '<p>A</p><p>B</p><p>C</p>' +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);
  });

  test('clear '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      range, html;

    range = new Range(parent, start, end);

    range.clear();

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);
  });

  test('replace '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      p = document.createElement('p'),
      range, html;

    p.textContent = 'replaced';

    range = new Range(parent, start, end);

    range.replace(p);

    html = factory.parent.startHTML +
           factory.start.HTML +
           '<p>replaced</p>' +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);
  });
};

function createCombinatorialTests(parents, starts, ends, contents) {
  for (var i=0; i<parents.length; i++) {
    for (var j=0; j<starts.length; j++) {
      for (var k=0; k<ends.length; k++) {
        for (var l=0; l<contents.length; l++) {
          createCombinatorialTest({
            parent: parents[i],
            start: starts[j],
            end: ends[k],
            content: contents[l]
          });
        }
      }
    }
  }
}

createCombinatorialTests(parents, starts, ends, contents);

