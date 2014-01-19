import { Placeholder } from "htmlbars/runtime/placeholder";

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
    create: function (frag) {
      return frag;
    },
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
    name: 'with an empty Placeholder',
    create: function (parent) { },
    HTML: ''
  },
  {
    name: 'with some paragraphs in the Placeholder',
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
  function filter() {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      end = factory.end.create(parent);

    // this is prevented in the parser by generating
    // empty text nodes at boundaries of fragments
    if (parent === frag && (start === null || end === null)) {
      return true;
    }

    return false;
  }

  if (filter()) {
    return;
  }

  test('appendChild '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      p, placeholder, html;

    placeholder = new Placeholder(parent, start, end);

    p = document.createElement('p');
    p.textContent = 'appended';
    placeholder.appendChild(p);

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           '<p>appended</p>' +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);

    var fixture = document.getElementById('qunit-fixture');
    fixture.appendChild(frag);

    p = document.createElement('p');
    p.textContent = 'appended';
    placeholder.appendChild(p);

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           '<p>appended</p>' +
           '<p>appended</p>' +
           factory.end.HTML +
           factory.parent.endHTML;

    equal(fixture.innerHTML, html);
  });

  test('appendText '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      placeholder, html;

    placeholder = new Placeholder(parent, start, end);

    placeholder.appendText('appended text');

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           'appended text' +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);

    var fixture = document.getElementById('qunit-fixture');
    fixture.appendChild(frag);

    placeholder.appendText('appended text');

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           'appended text' +
           'appended text' +
           factory.end.HTML +
           factory.parent.endHTML;

    equal(fixture.innerHTML, html);
  });

  test('appendHTML '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      placeholder, html;

    placeholder = new Placeholder(parent, start, end);

    placeholder.appendHTML('<p>A</p><p>B</p><p>C</p>');

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           '<p>A</p><p>B</p><p>C</p>' +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);

    var fixture = document.getElementById('qunit-fixture');
    fixture.appendChild(frag);

    placeholder.appendHTML('<p>A</p><p>B</p><p>C</p>');

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.content.HTML +
           '<p>A</p><p>B</p><p>C</p>' +
           '<p>A</p><p>B</p><p>C</p>' +
           factory.end.HTML +
           factory.parent.endHTML;

    equal(fixture.innerHTML, html);
  });

  test('clear '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      placeholder, html;

    placeholder = new Placeholder(parent, start, end);

    placeholder.clear();

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);
  });

  test('clear after insert '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      placeholder, html;

    placeholder = new Placeholder(parent, start, end);

    var fixture = document.getElementById('qunit-fixture');
    fixture.appendChild(frag);

    placeholder.clear();

    html = factory.parent.startHTML +
           factory.start.HTML +
           factory.end.HTML +
           factory.parent.endHTML;

    equal(fixture.innerHTML, html);
  });

  test('replace '+factory.parent.name+' '+factory.start.name+' '+factory.end.name+' '+factory.content.name, function () {
    var frag = document.createDocumentFragment(),
      parent = factory.parent.create(frag),
      start = factory.start.create(parent),
      content = factory.content.create(parent),
      end = factory.end.create(parent),
      p = document.createElement('p'),
      placeholder, html;

    p.textContent = 'replaced';

    placeholder = new Placeholder(parent, start, end);

    placeholder.replace(p);

    html = factory.parent.startHTML +
           factory.start.HTML +
           '<p>replaced</p>' +
           factory.end.HTML +
           factory.parent.endHTML;

    equalHTML(frag, html);
  });
};

function createCombinatorialTests(parents, starts, ends, contents) {
  QUnit.module('Placeholder');

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

