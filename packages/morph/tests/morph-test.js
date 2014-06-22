import Morph from "morph/morph";
import { equalHTML } from "test/support/assertions";
import SafeString from 'handlebars/safe-string';

function morphTests(factory) {
  test('updateNode '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      morph = setup.morph,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    morph.updateNode(element('p', 'updated'));

    html = startHTML+'<p>updated</p>'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(setup.fragment);

    morph.updateNode(element('p', 'updated again'));

    html = startHTML+'<p>updated again</p>'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('updateText '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      morph = setup.morph,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    morph.updateText('updated');

    html = startHTML+'updated'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(fragment);

    morph.updateText('updated again');

    html = startHTML+'updated again'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('updateHTML '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      morph = setup.morph,
      startHTML = setup.startHTML,
      contentHTML = setup.contentHTML,
      endHTML = setup.endHTML,
      html;

    morph.updateHTML('<p>A</p><p>B</p><p>C</p>');

    html = startHTML+'<p>A</p><p>B</p><p>C</p>'+endHTML;

    equalHTML(fragment, html);

    fixture.appendChild(fragment);

    morph.updateHTML('<p>updated</p>');

    html = startHTML+'<p>updated</p>'+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('destroy '+factory.name, function () {
    var setup = factory.create(),
      fragment = setup.fragment,
      morph = setup.morph,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    morph.destroy();

    html = startHTML+endHTML;

    equalHTML(fragment, html);
  });

  test('destroy after insert '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      morph = setup.morph,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    fixture.appendChild(fragment);

    morph.destroy();

    html = startHTML+endHTML;

    equal(fixture.innerHTML, html);
  });

  test('update '+factory.name, function () {
    var setup = factory.create(),
      fragment = setup.fragment,
      morph = setup.morph,
      startHTML = setup.startHTML,
      endHTML = setup.endHTML,
      html;

    morph.update(element('p', 'updated'));
    html = startHTML+'<p>updated</p>'+endHTML;
    equalHTML(fragment, html);

    morph.update('updated');
    html = startHTML+'updated'+endHTML;
    equalHTML(fragment, html);

    morph.update(new SafeString('<p>updated</p>'));
    html = startHTML+'<p>updated</p>'+endHTML;
    equalHTML(fragment, html);

    var duckTypedSafeString = {
      string: '<div>updated</div>'
    };
    morph.update(duckTypedSafeString);
    html = startHTML+'<div>updated</div>'+endHTML;
    equalHTML(fragment, html);
  });
}

function checkChildMorphState(morph) {
  var morphs = morph.morphs, i, l;
  for (i=0, l=morphs.length; i<l; i++) {
    if (i === 0) {
      equal(morphs[i].before, null);
      equal(morphs[i].start, morph.start);
    } else {
      equal(morphs[i].before, morphs[i-1]);
      equal(morphs[i].start, morphs[i-1].end.previousSibling);
    }

    if (i === l-1) {
      equal(morphs[i].end, morph.end);
      equal(morphs[i].after, null);
    } else {
      equal(morphs[i].end,   morphs[i+1].start.nextSibling);
      equal(morphs[i].after, morphs[i+1]);
    }
  }
}

function morphListTests(factory) {
  test('various list operations with fragments '+factory.name, function () {
    var fixture = document.getElementById('qunit-fixture'),
      setup = factory.create(),
      fragment = setup.fragment,
      morph = setup.morph,
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

    morph.replace(0, 0, [fragmentABC, D, fragmentEF]);

    var morphs = morph.morphs;

    html = startHTML+'<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p><p>F</p>'+endHTML;
    equalHTML(fragment, html);
    equal(morphs[0].start, morph.start);
    equal(morphs[0].end, D);
    equal(morphs[1].start, C);
    equal(morphs[1].end, E);
    equal(morphs[2].start, D);
    equal(morphs[2].end, morph.end);

    morph.append(new SafeString('<b>G</b>'));
    morph.append(element('i', 'H'));
    morph.append('I');
    morph.append(fragmentFor(element('p','J'),element('p','K')));

    html = startHTML+'<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p><p>F</p><b>G</b><i>H</i>I<p>J</p><p>K</p>'+endHTML;
    equalHTML(fragment, html);
    equal(morphs.length, 7);
    checkChildMorphState(morph);

    var end = morph.insert(7, 'end');
    var middle = morph.insert(4, 'middle');
    var begin = morph.insert(0, 'begin');

    html = startHTML+'<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p><p>F</p><b>G</b><i>H</i>I<p>J</p><p>K</p>'+endHTML;

    equal(morphs.length, 10);
    checkChildMorphState(morph);

    morph.removeMorph(begin);
    morph.removeMorph(middle);
    morph.removeMorph(end);

    morph.replace(1,6);

    html = startHTML+'<p>A</p><p>B</p><p>C</p>'+endHTML;
    equalHTML(fragment, html);
    equal(morphs.length, 1);
    checkChildMorphState(morph);

    morph.replace(1,0,['D', '', null, 'E', new SafeString('<p>F</p>')]);
    html = startHTML+'<p>A</p><p>B</p><p>C</p>DE<p>F</p>'+endHTML;
    equalHTML(fragment, html);

    equal(morph.morphs.length, 6);
    checkChildMorphState(morph);

    morphs[3].destroy();
    morphs[3].update(element('i', 'E'));
    morphs[1].update(element('b', 'D'));
    morphs[2].destroy();

    html = startHTML+'<p>A</p><p>B</p><p>C</p><b>D</b><i>E</i><p>F</p>'+endHTML;
    equalHTML(fragment, html);
    equal(morph.morphs.length, 4);
    checkChildMorphState(morph);

    fixture.appendChild(fragment);

    morph.replace(2,2);

    morphs[1].update(
      fragmentFor(
        element('p','D'),
        element('p','E'),
        element('p','F')
      )
    );

    html = startHTML+'<p>A</p><p>B</p><p>C</p><p>D</p><p>E</p><p>F</p>'+endHTML;
    equal(fixture.innerHTML, html);

    equal(morph.morphs.length, 2);
    checkChildMorphState(morph);

    morph.replace(1,0,['between']);

    html = startHTML+'<p>A</p><p>B</p><p>C</p>between<p>D</p><p>E</p><p>F</p>'+endHTML;
    equal(fixture.innerHTML, html);
    equal(morph.morphs.length, 3);
    checkChildMorphState(morph);
  });
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
    name: 'with an empty Morph',
    create: function (parent) { },
    HTML: ''
  },
  {
    name: 'with some paragraphs in the Morph',
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
          morph: Morph.create(parent, startIndex, endIndex),
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

QUnit.module('Morph');
iterateCombinations(parents, starts, ends, contents, morphTests);

QUnit.module('MorphList');
iterateCombinations(parents, starts, ends, [{name:'', create: function(){},HTML:''}], morphListTests);
