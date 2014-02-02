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
      return parent.childNodes.length-1;
    },
    HTML: 'Some text before '
  },
  {
    name: 'with no sibling before',
    create: function (parent) {
      return -1;
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
      return parent.childNodes.length-1;
    },
    HTML: ' some text after.'
  },
  {
    name: 'and no sibling after',
    create: function (parent) {
      return -1;
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

function placeholderTests(factory) {
  test('appendChild '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      p, html;

    p = document.createElement('p');
    p.appendChild(document.createTextNode('appended'));

    placeholder.appendChild(p);

    html = startHTML+contentHTML+'<p>appended</p>'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(setup.fragment);

    p = document.createElement('p');
    p.appendChild(document.createTextNode('more'));
    placeholder.appendChild(p);

    html = startHTML+contentHTML+'<p>appended</p><p>more</p>'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('appendText '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.appendText('appended text');

    html = startHTML+contentHTML+'appended text'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(fragment);

    placeholder.appendText(' more');

    html = startHTML+contentHTML+'appended text more'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('appendHTML '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.appendHTML('<p>A</p><p>B</p><p>C</p>');

    html = startHTML+contentHTML+'<p>A</p><p>B</p><p>C</p>'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(fragment);

    placeholder.appendHTML('<p>A</p><p>B</p><p>C</p>');

    html = startHTML+contentHTML+'<p>A</p><p>B</p><p>C</p><p>A</p><p>B</p><p>C</p>'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('clear '+factory.name, function () {
    var setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.clear();

    html = startHTML+endHTML;

    equalHTML(fragment, html);
  });

  test('clear after insert '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    fixture.appendChild(fragment);

    placeholder.clear();

    html = startHTML+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('replace '+factory.name, function () {
    var setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      p = document.createElement('p'),
      html;

    p.appendChild(document.createTextNode('replaced'));

    placeholder.replace(p);

    html = startHTML+'<p>replaced</p>'+endHTML;

    equalHTML(fragment, html);
  });
}

function iterateCombinations(parents, starts, ends, contents, callback) {
  function buildFactory(parentFactory, startFactory, endFactory, contentFactory) {
    return {
      name: parentFactory.name+' '+startFactory.name+' '+endFactory.name+' '+contentFactory.name,
      create: function factory() {
        var fragment = document.createDocumentFragment(),
        parent = parentFactory.create(fragment),
        startIndex = startFactory.create(parent),
        content = contentFactory.create(parent),
        endIndex = endFactory.create(parent);

        // this is prevented in the parser by generating
        // empty text nodes at boundaries of fragments

        if (parent === fragment && (startIndex === -1 || endIndex === -1)) {
          return null;
        }

        return {
          fragment: fragment,
          placeholder: new Placeholder(parent, startIndex, endIndex),
          startHTML: parentFactory.startHTML + startFactory.HTML,
          contentHTML: contentFactory.HTML,
          endHTML: endFactory.HTML + parentFactory.endHTML
        };
      }
    };
  }

  for (var i=0; i<parents.length; i++) {
    for (var j=0; j<starts.length; j++) {
      for (var k=0; k<ends.length; k++) {
        for (var l=0; l<contents.length; l++) {
          var factory = buildFactory(parents[i], starts[i], ends[i], contents[i]);
          if (factory.create() === null) continue; // unsupported combo
          callback(factory);
        }
      }
    }
  }
}

QUnit.module('Placeholder');

iterateCombinations(parents, starts, ends, contents, placeholderTests);
