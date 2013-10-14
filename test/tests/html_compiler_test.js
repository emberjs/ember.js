import { compileSpec } from "htmlbars/compiler";
import { hydrate } from "htmlbars/runtime";

function compile(string) {
  var spec = compileSpec(string);
  console.log(helpers);
  return hydrate(spec, { helpers: helpers });
}

function frag(element, string) {
  if (element instanceof DocumentFragment) {
    element = document.createElement('div');
  }

  var range = document.createRange();
  range.setStart(element, 0);
  range.collapse(false);
  return range.createContextualFragment(string);
}

var helpers;

function registerHelper(name, callback) {
  helpers[name] = callback;
}

module("HTML-based compiler (output)", {
  setup: function() {
    helpers = {};
  }
});

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  equal(div.innerHTML, html);
}

test("Simple content produces a document fragment", function() {
  var template = compile("content");
  var fragment = template();

  equalHTML(fragment, "content");
});

test("Simple elements are created", function() {
  var template = compile("<div>content</div>");
  var fragment = template();

  equalHTML(fragment, "<div>content</div>");
});

test("Simple elements can have attributes", function() {
  var template = compile("<div class='foo' id='bar'>content</div>");
  var fragment = template();

  equalHTML(fragment, '<div class="foo" id="bar">content</div>');
});

function shouldBeVoid(tagName) {
  var html = "<" + tagName + " data-foo='bar'><p>hello</p>";
  var template = compile(html);
  var fragment = template();


  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  var tag = '<' + tagName + ' data-foo="bar">';
  var closing = '</' + tagName + '>';
  var extra = "<p>hello</p>";
  html = div.innerHTML;

  QUnit.push((html === tag + extra) || (html === tag + closing + extra), html, tag + closing + extra, tagName + "should be a void element");
}

test("Void elements are self-closing", function() {
  var voidElements = "area base br col command embed hr img input keygen link meta param source track wbr";

  voidElements.split(" ").forEach(function(tagName) {
    shouldBeVoid(tagName);
  });
});

test("The compiler can handle nesting", function() {
  var html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div> More content';
  var template = compile(html);
  var fragment = template();

  equalHTML(fragment, html);
});

test("The compiler can handle quotes", function() {
  compilesTo('<div>"This is a title," we\'re on a boat</div>');
});

function compilesTo(html, expected, context) {
  var template = compile(html);
  var fragment = template(context);

  equalHTML(fragment, expected === undefined ? html : expected);
  return fragment;
}

test("The compiler can handle simple handlebars", function() {
  compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler can handle paths", function() {
  compilesTo('<div>{{post.title}}</div>', '<div>hello</div>', { post: { title: 'hello' }});
});

test("The compiler can handle escaping HTML", function() {
  compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle unescaped HTML", function() {
  compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle simple helpers", function() {
  registerHelper('testing', function(path, options) {
    return this[path[0]];
  });

  compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler tells helpers what kind of expression the path is", function() {
  registerHelper('testing', function(path, options) {
    return options.types[0] + '-' + path;
  });

  compilesTo('<div>{{testing "title"}}</div>', '<div>string-title</div>');
  compilesTo('<div>{{testing 123}}</div>', '<div>number-123</div>');
  compilesTo('<div>{{testing true}}</div>', '<div>boolean-true</div>');
  compilesTo('<div>{{testing false}}</div>', '<div>boolean-false</div>');
});

test("The compiler passes along the hash arguments", function() {
  registerHelper('testing', function(options) {
    return options.hash.first + '-' + options.hash.second;
  });

  compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
});

test("The compiler passes along the types of the hash arguments", function() {
  registerHelper('testing', function(options) {
    return options.hashTypes.first + '-' + options.hash.first;
  });

  compilesTo('<div>{{testing first="one"}}</div>', '<div>string-one</div>');
  compilesTo('<div>{{testing first=one}}</div>', '<div>id-one</div>');
  compilesTo('<div>{{testing first=1}}</div>', '<div>number-1</div>');
  compilesTo('<div>{{testing first=true}}</div>', '<div>boolean-true</div>');
  compilesTo('<div>{{testing first=false}}</div>', '<div>boolean-false</div>');
});

test("The compiler provides the current element as an option", function() {
  var textNode;
  registerHelper('testing', function(options) {
    textNode = document.createTextNode("testy");
    options.element.appendChild(textNode);
  });

  compilesTo('<div>{{testing}}</div>', '<div>testy</div>');
  equal(textNode.textContent, 'testy');
});

test("It is possible to override the resolution mechanism", function() {
  registerHelper('RESOLVE', function(parts, options) {
    if (parts[0] === 'zomg') {
      options.element.appendChild(document.createTextNode(this.zomg));
    } else {
      options.element.appendChild(document.createTextNode(parts.join("-")));
    }
  });

  compilesTo('<div>{{foo}}</div>', '<div>foo</div>');
  compilesTo('<div>{{foo.bar}}</div>', '<div>foo-bar</div>');
  compilesTo('<div>{{zomg}}</div>', '<div>hello</div>', { zomg: 'hello' });
});

test("Simple data binding using text nodes", function() {
  var callback;

  registerHelper('RESOLVE', function(parts, options) {
    var context = this,
        textNode = document.createTextNode(context[parts[0]]);

    callback = function() {
      var value = context[parts[0]],
          parent = textNode.parentNode,
          originalText = textNode;

      textNode = document.createTextNode(value);
      parent.insertBefore(textNode, originalText);
      parent.removeChild(originalText);
    };

    options.element.appendChild(textNode);
  });

  var object = { title: 'hello' };
  var fragment = compilesTo('<div>{{title}} world</div>', '<div>hello world</div>', object);

  object.title = 'goodbye';
  callback();

  equalHTML(fragment, '<div>goodbye world</div>');

  object.title = 'brown cow';
  callback();

  equalHTML(fragment, '<div>brown cow world</div>');
});

test("Simple data binding on fragments", function() {
  var callback;

  registerHelper('RESOLVE', function(parts, options) {
    var context = this,
        fragment = frag(options.element, context[parts[0]]);

    var firstChild = fragment.firstChild,
        lastChild = fragment.lastChild;

    callback = function() {
      var range = document.createRange();
      range.setStartBefore(firstChild);
      range.setEndAfter(lastChild);

      var value = context[parts[0]],
          fragment = range.createContextualFragment(value);

      firstChild = fragment.firstChild;
      lastChild = fragment.lastChild;

      range.deleteContents();
      range.insertNode(fragment);
    };

    options.element.appendChild(fragment);
  });

  var object = { title: '<p>hello</p> to the' };
  var fragment = compilesTo('<div>{{title}} world</div>', '<div><p>hello</p> to the world</div>', object);

  object.title = '<p>goodbye</p> to the';
  callback();

  equalHTML(fragment, '<div><p>goodbye</p> to the world</div>');

  object.title = '<p>brown cow</p> to the';
  callback();

  equalHTML(fragment, '<div><p>brown cow</p> to the world</div>');
});

test("RESOLVE hook receives escaping information", function() {
  expect(3);

  registerHelper('RESOLVE', function(parts, options) {
    if (parts[0] === 'escaped') {
      equal(options.escaped, true);
    } else if (parts[0] === 'unescaped') {
      equal(options.escaped, false);
    }

    options.element.appendChild(document.createTextNode(parts[0]));
  });

  compilesTo('<div>{{escaped}}-{{{unescaped}}}</div>', '<div>escaped-unescaped</div>');
});

test("Helpers receive escaping information", function() {
  registerHelper('testing', function(path, options) {
    if (path === 'escaped') {
      equal(options.escaped, true);
    } else if (path === 'unescaped') {
      equal(options.escaped, false);
    }

    options.element.appendChild(document.createTextNode(path));
  });

  compilesTo('<div>{{testing escaped}}-{{{testing unescaped}}}</div>', '<div>escaped-unescaped</div>');
});

test("Attributes can use computed values", function() {
  compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});

test("Attributes can use computed paths", function() {
  compilesTo('<a href="{{post.url}}">linky</a>', '<a href="linky.html">linky</a>', { post: { url: 'linky.html' }});
});

test("It is possible to override the resolution mechanism for attributes", function() {
  registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
    return 'http://google.com/' + this[parts[0]];
  });

  compilesTo('<a href="{{url}}">linky</a>', '<a href="http://google.com/linky.html">linky</a>', { url: 'linky.html' });
});

test("It is possible to use RESOLVE_IN_ATTR for data binding", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
    callback = function() {
      options.rerender();
    };

    return this[parts[0]];
  });

  var object = { url: 'linky.html' };
  var fragment = compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', object);

  object.url = 'clippy.html';
  callback();

  equalHTML(fragment, '<a href="clippy.html">linky</a>');

  object.url = 'zippy.html';
  callback();

  equalHTML(fragment, '<a href="zippy.html">linky</a>');
});

test("Attributes can be populated with helpers that generate a string", function() {
  registerHelper('testing', function(path, options) {
    return this[path];
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});

test("A helper can return a value for the attribute", function() {
  registerHelper('testing', function(path, options) {
    return this[path];
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});

test("Attribute helpers take a hash", function() {
  registerHelper('testing', function(options) {
    return this[options.hash.path];
  });

  compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});

test("Attribute helpers can use the hash for data binding", function() {
  var callback;

  registerHelper('testing', function(path, options) {
    callback = function() {
      options.rerender();
    };

    return this[path] ? options.hash.truthy : options.hash.falsy;
  });

  var object = { on: true };
  var fragment = compilesTo('<div class="{{testing on truthy="yeah" falsy="nope"}}">hi</div>', '<div class="yeah">hi</div>', object);

  object.on = false;
  callback();
  equalHTML(fragment, '<div class="nope">hi</div>');
});

test("Attributes containing multiple helpers are treated like a block", function() {
  compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', { url: 'example.com' });
});

test("Attributes containing a path is treated like a block", function() {
  compilesTo('<a href="http://{{person.url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', { person: { url: 'example.com' } });
});

test("Attributes containing a helper is treated like a block", function() {
  registerHelper('testing', function(number, options) {
    return "example.com";
  });

  compilesTo('<a href="http://{{testing 123}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', { person: { url: 'example.com' } });
});

test("It is possible to trigger a re-render of an attribute from a child resolution", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    callback = function() {
      options.rerender();
    };

    return this[path];
  });

  var context = { url: "example.com" };
  var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalHTML(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("Attribute runs can contain helpers", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    callback = function() {
      options.rerender();
    };

    return this[path];
  });

  registerHelper('testing', function(path, options) {
    callback = function() {
      options.rerender();
    };

    if (options.types[0] === 'id') {
      return this[path] + '.html';
    } else {
      return path;
    }
  });

  var context = { url: "example.com", path: 'index' };
  var fragment = compilesTo('<a href="http://{{url}}/{{testing path}}/{{testing "linky"}}">linky</a>', '<a href="http://example.com/index.html/linky">linky</a>', context);

  context.url = "www.example.com";
  context.path = "yep";
  callback();

  equalHTML(fragment, '<a href="http://www.example.com/yep.html/linky">linky</a>');

  context.url = "nope.example.com";
  context.path = "nope";
  callback();

  equalHTML(fragment, '<a href="http://nope.example.com/nope.html/linky">linky</a>');
});

test("A simple block helper can return the default document fragment", function() {
  registerHelper('testing', function(options) {
    return options.render(this);
  });

  compilesTo('{{#testing}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

test("A block helper can pass a context to be used in the child", function() {
  registerHelper('testing', function(options) {
    return options.render({ title: 'Rails is omakase' });
  });

  compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
});

test("A block helper can insert the document fragment manually", function() {
  registerHelper('testing', function(options) {
    var frag = options.render({ title: 'Rails is omakase' });
    options.element.appendChild(frag);
  });

  compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
});

test("Block helpers receive hash arguments", function() {
  registerHelper('testing', function(options) {
    if (options.hash.truth) {
      return options.render(this);
    }
  });

  compilesTo('{{#testing truth=true}}<p>Yep!</p>{{/testing}}{{#testing truth=false}}<p>Nope!</p>{{/testing}}', '<p>Yep!</p>');
});

test("Data-bound block helpers", function() {
  var callback;

  registerHelper('testing', function(path, options) {
    var context = this, firstElement, lastElement;

    var frag = buildFrag();

    function buildFrag() {
      var frag;

      var value = context[path];

      if (value) {
        frag = options.render(context);
      } else {
        frag = document.createDocumentFragment();
      }

      if (!frag.firstChild) {
        firstElement = lastElement = document.createTextNode('');
        frag.appendChild(firstElement);
      } else {
        firstElement = frag.firstChild;
        lastElement = frag.lastChild;
      }

      return frag;
    }

    callback = function() {
      var range = document.createRange();
      range.setStartBefore(firstElement);
      range.setEndAfter(lastElement);

      var frag = buildFrag();

      range.deleteContents();
      range.insertNode(frag);
    };

    return frag;
  });

  var object = { shouldRender: false };
  var template = '<p>hi</p> content {{#testing shouldRender}}<p>Appears!</p>{{/testing}} more <em>content</em> here';
  var fragment = compilesTo(template, '<p>hi</p> content  more <em>content</em> here', object);

  object.shouldRender = true;
  callback();

  equalHTML(fragment, '<p>hi</p> content <p>Appears!</p> more <em>content</em> here'); 

  object.shouldRender = false;
  callback();

  equalHTML(fragment, '<p>hi</p> content  more <em>content</em> here');
});

test("Node helpers can modify the node", function() {
  registerHelper('testing', function(options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('<div {{testing}}>Node helpers</div>', '<div zomg="zomg">Node helpers</div>');
});

test("Node helpers can be used for attribute bindings", function() {
  var callback;

  registerHelper('testing', function(options) {
    var context = this,
        path = options.hash.href,
        element = options.element;

    callback = function() {
      var value = context[path];
      element.setAttribute('href', value);
    };

    callback();
  });

  var object = { url: 'linky.html' };
  var fragment = compilesTo('<a {{testing href="url"}}>linky</a>', '<a href="linky.html">linky</a>', object);

  object.url = 'zippy.html';
  callback();

  equalHTML(fragment, '<a href="zippy.html">linky</a>');
});
