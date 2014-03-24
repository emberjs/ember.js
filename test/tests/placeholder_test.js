import { Placeholder } from "htmlbars/runtime/placeholder";
import SafeString from 'handlebars/safe-string';

function placeholderTests(factory) {
  test('updateNode '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.updateNode(element('p', 'updated'));

    html = startHTML+'<p>updated</p>'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(setup.fragment);

    placeholder.updateNode(element('p', 'updated again'));

    html = startHTML+'<p>updated again</p>'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('updateText '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.updateText('updated');

    html = startHTML+'updated'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(fragment);

    placeholder.updateText('updated again');

    html = startHTML+'updated again'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('updateHTML '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.updateHTML('<p>A</p><p>B</p><p>C</p>');

    html = startHTML+'<p>A</p><p>B</p><p>C</p>'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(fragment);

    placeholder.updateHTML('<p>updated</p>');

    html = startHTML+'<p>updated</p>'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('destroy '+factory.name, function () {
    var setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.destroy();

    html = startHTML+endHTML;

    equalHTML(fragment, html);
  });

  test('destroy after insert '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    fixture.appendChild(fragment);

    placeholder.destroy();

    html = startHTML+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('update '+factory.name, function () {
    var setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    placeholder.update(element('p', 'updated'));
    html = startHTML+'<p>updated</p>'+endHTML;
    equalHTML(fragment, html);

    placeholder.update('updated');
    html = startHTML+'updated'+endHTML;
    equalHTML(fragment, html);

    placeholder.update(new SafeString('<p>updated</p>'));
    html = startHTML+'<p>updated</p>'+endHTML;
    equalHTML(fragment, html);

    var duckTypedSafeString = {
      string: '<div>updated</div>'
    };
    placeholder.update(duckTypedSafeString);
    html = startHTML+'<div>updated</div>'+endHTML;
    equalHTML(fragment, html);
  });
}

function placeholderListTests(factory) {
  test('various list operations with fragments '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      placeholder = setup.placeholder,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    var A = element('p', 'A');
    var B = element('p', 'B');
    var C = element('p', 'C');
    var D = element('p', 'D');
    var E = element('p', 'E');
    var F = element('p', 'F');

    var fragmentABC = fragmentFor(A,B,C);
    var fragmentEF = fragmentFor(E,F);

    placeholder.replace(0, 0, [fragmentABC, D, fragmentEF]);

    var placeholders = placeholder.placeholders;

    html = startHTML+'<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p><p>F</p>'+endHTML;
    equalHTML(fragment, html);
    equal(placeholders[0].start, placeholder.start);
    equal(placeholders[0].end, D);
    equal(placeholders[1].start, C);
    equal(placeholders[1].end, E);
    equal(placeholders[2].start, D);
    equal(placeholders[2].end, placeholder.end);

    placeholder.replace(1,2);

    html = startHTML+'<p>A</p><p>B</p><p>C</p>'+endHTML;
    equalHTML(fragment, html);
    equal(placeholders.length, 1);
    equal(placeholders[0].start, placeholder.start);
    equal(placeholders[0].end, placeholder.end);

    placeholder.replace(1,0,['D', '', null, 'E', new SafeString('<p>F</p>')]);
    html = startHTML+'<p>A</p><p>B</p><p>C</p>DE<p>F</p>'+endHTML;
    equalHTML(fragment, html);

    equal(placeholder.placeholders.length, 6);
    equal(placeholders[0].start, placeholder.start);
    equal(placeholders[0].end,   placeholders[1].start.nextSibling);
    equal(placeholders[1].start, placeholders[0].end.previousSibling);
    equal(placeholders[1].end,   placeholders[2].start.nextSibling);
    equal(placeholders[2].start, placeholders[1].end.previousSibling);
    equal(placeholders[2].end,   placeholders[3].start.nextSibling);
    equal(placeholders[3].start, placeholders[2].end.previousSibling);
    equal(placeholders[3].end,   placeholders[4].start.nextSibling);
    equal(placeholders[4].start, placeholders[3].end.previousSibling);
    equal(placeholders[4].end,   placeholders[5].start.nextSibling);
    equal(placeholders[5].start, placeholders[4].end.previousSibling);
    equal(placeholders[5].end,   placeholder.end);

    placeholders[3].destroy();
    placeholders[3].update(element('i', 'E'));
    placeholders[1].update(element('b', 'D'));
    placeholders[2].destroy();

    html = startHTML+'<p>A</p><p>B</p><p>C</p><b>D</b><i>E</i><p>F</p>'+endHTML;
    equalHTML(fragment, html);
    equal(placeholder.placeholders.length, 4);
    equal(placeholders[0].start, placeholder.start);
    equal(placeholders[0].end,   placeholders[1].start.nextSibling);
    equal(placeholders[1].start, placeholders[0].end.previousSibling);
    equal(placeholders[1].end,   placeholders[2].start.nextSibling);
    equal(placeholders[2].start, placeholders[1].end.previousSibling);
    equal(placeholders[2].end,   placeholders[3].start.nextSibling);
    equal(placeholders[3].start, placeholders[2].end.previousSibling);
    equal(placeholders[3].end,   placeholder.end);

    fixture.appendChild(fragment);

    placeholder.replace(2,2);

    placeholders[1].update(
      fragmentFor(
        element('p','D'),
        element('p','E'),
        element('p','F')
      )
    );

    html = startHTML+'<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p><p>F</p>'+endHTML;
    equal(fixture.innerHTML, html);

    equal(placeholder.placeholders.length, 2);
    equal(placeholders[0].start,  placeholder.start);
    equal(placeholders[0].end,    placeholders[1].start.nextSibling);
    equal(placeholders[0].before, null);
    equal(placeholders[0].after,  placeholders[1]);
    equal(placeholders[1].start,  placeholders[0].end.previousSibling);
    equal(placeholders[1].end,    placeholder.end);
    equal(placeholders[1].before, placeholders[0]);
    equal(placeholders[1].after,  null);
  });
}

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
}

function fragmentFor() {
  var fragment = document.createDocumentFragment();
  for (var i=0,l=arguments.length; i<l; i++) {
    fragment.appendChild(arguments[i]);
  }
  return fragment;
}

function element(tag, text) {
  var el = document.createElement(tag);
  el.appendChild(document.createTextNode(text));
  return el;
}

function textNode(text) {
  return document.createTextNode(text);
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

function iterateCombinations(parents, starts, ends, contents, callback) {
  function buildFactory(parentFactory, startFactory, endFactory, contentFactory) {
    return {
      name: [parentFactory.name, startFactory.name, endFactory.name, contentFactory.name].join(' '),
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
          placeholder: Placeholder.create(parent, startIndex, endIndex),
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
          var factory = buildFactory(parents[i], starts[j], ends[k], contents[l]);
          if (factory.create() === null) continue; // unsupported combo
          callback(factory);
        }
      }
    }
  }
}

QUnit.module('Placeholder');
iterateCombinations(parents, starts, ends, contents, placeholderTests);

QUnit.module('PlaceholderList');
iterateCombinations(parents, starts, ends, [{name:'', create: function(){},HTML:''}], placeholderListTests);
