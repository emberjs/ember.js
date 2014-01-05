import { TemplateCompiler } from "htmlbars/compiler/template";
import { hydrate } from "htmlbars/runtime";
import { RESOLVE, RESOLVE_IN_ATTR, ATTRIBUTE } from "htmlbars/runtime/helpers";

function compile(string) {
  var compiler =  new TemplateCompiler();
  return compiler.compile(string);
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
    helpers = {RESOLVE: RESOLVE, RESOLVE_IN_ATTR: RESOLVE_IN_ATTR, ATTRIBUTE: ATTRIBUTE};
  }
});

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
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
  var fragment = template(context, {helpers: helpers});

  equalHTML(fragment, expected === undefined ? html : expected);
  return fragment;
}

test("The compiler can handle simple handlebars", function() {
  compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler can handle escaping HTML", function() {
  compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle unescaped HTML", function() {
  compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle simple helpers", function() {
  registerHelper('testing', function(context, params, options) {
    return context[params[0]];
  });

  compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler tells helpers what kind of expression the path is", function() {
  registerHelper('testing', function(context, params, options) {
    return options.types[0] + '-' + params[0];
  });

  compilesTo('<div>{{testing "title"}}</div>', '<div>string-title</div>');
  compilesTo('<div>{{testing 123}}</div>', '<div>number-123</div>');
  compilesTo('<div>{{testing true}}</div>', '<div>boolean-true</div>');
  compilesTo('<div>{{testing false}}</div>', '<div>boolean-false</div>');
});

test("The compiler passes along the hash arguments", function() {
  registerHelper('testing', function(context, params, options) {
    return options.hash.first + '-' + options.hash.second;
  });

  compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
});

test("The compiler passes along the types of the hash arguments", function() {
  registerHelper('testing', function(context, params, options) {
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
  registerHelper('testing', function(context, params, options) {
    textNode = document.createTextNode("testy");
    options.element.appendChild(textNode);
  });

  compilesTo('<div>{{testing}}</div>', '<div>testy</div>');
  equal(textNode.textContent, 'testy');
});

test("It is possible to override the resolution mechanism", function() {
  registerHelper('RESOLVE', function(context, path, params, options) {
    if (path === 'zomg') {
      options.element.appendChild(document.createTextNode(context.zomg));
    } else {
      options.element.appendChild(document.createTextNode(path.replace(".", "-")));
    }
  });

  compilesTo('<div>{{foo}}</div>', '<div>foo</div>');
  compilesTo('<div>{{foo.bar}}</div>', '<div>foo-bar</div>');
  compilesTo('<div>{{zomg}}</div>', '<div>hello</div>', { zomg: 'hello' });
});

test("Simple data binding using text nodes", function() {
  var callback;

  registerHelper('RESOLVE', function(context, path, params, options) {
    var textNode = document.createTextNode(context[path]);

    callback = function() {
      var value = context[path],
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

  registerHelper('RESOLVE', function(context, path, params, options) {
    var fragment = frag(options.element.parent, context[path]);

    var firstChild = fragment.firstChild,
        lastChild = fragment.lastChild;

    callback = function() {
      var range = document.createRange();
      range.setStartBefore(firstChild);
      range.setEndAfter(lastChild);

      var value = context[path],
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

  registerHelper('RESOLVE', function(context, path, params, options) {
    if (path === 'escaped') {
      equal(options.escaped, true);
    } else if (path === 'unescaped') {
      equal(options.escaped, false);
    }

    options.element.appendChild(document.createTextNode(path));
  });

  compilesTo('<div>{{escaped}}-{{{unescaped}}}</div>', '<div>escaped-unescaped</div>');
});

test("Helpers receive escaping information", function() {
  expect(3);

  registerHelper('testing', function(context, params, options) {
    if (params[0] === 'escaped') {
      equal(options.escaped, true);
    } else if (params[0] === 'unescaped') {
      equal(options.escaped, false);
    }

    options.element.appendText(params[0]);
  });

  compilesTo('<div>{{testing escaped}}-{{{testing unescaped}}}</div>', '<div>escaped-unescaped</div>');
});

test("Attributes can use computed values", function() {
  compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});

// test("Attributes can use computed paths", function() {
//   compilesTo('<a href="{{post.url}}">linky</a>', '<a href="linky.html">linky</a>', { post: { url: 'linky.html' }});
// });

function streamValue(value) {
  return {
    subscribe: function(callback) {
      callback(value);
      return { connect: function() {} };
    }
  };
}

function boundValue(valueGetter, binding) {
  var subscription;

  var stream = {
    subscribe: function(next) {
      subscription = next;
      callback();
      return { connect: function() {} };
    }
  };

  return stream;

  function callback() {
    subscription(valueGetter.call(binding, callback));
  }
}

test("It is possible to override the resolution mechanism for attributes", function() {
  registerHelper('RESOLVE_IN_ATTR', function(context, path, params, options) {
    return 'http://google.com/' + context[path];
  });

  compilesTo('<a href="{{url}}">linky</a>', '<a href="http://google.com/linky.html">linky</a>', { url: 'linky.html' });
});

/*

test("It is possible to use RESOLVE_IN_ATTR for data binding", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
    return boundValue(function(c) {
      callback = c;
      return this[parts[0]];
    }, this);
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
*/

test("Attributes can be populated with helpers that generate a string", function() {
  registerHelper('testing', function(context, params, options) {
    return context[params[0]];
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
/*
test("A helper can return a stream for the attribute", function() {
  registerHelper('testing', function(path, options) {
    return streamValue(this[path]);
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
*/
test("Attribute helpers take a hash", function() {
  registerHelper('testing', function(context, params, options) {
    return context[options.hash.path];
  });

  compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});
/*
test("Attribute helpers can use the hash for data binding", function() {
  var callback;

  registerHelper('testing', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path] ? options.hash.truthy : options.hash.falsy;
    }, this);
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
    return streamValue("example.com");
  });

  compilesTo('<a href="http://{{testing 123}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', { person: { url: 'example.com' } });
});

test("It is possible to trigger a re-render of an attribute from a child resolution", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path];
    }, this);
  });

  var context = { url: "example.com" };
  var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalHTML(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("A child resolution can pass contextual information to the parent", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path];
    }, this);
  });

  var context = { url: "example.com" };
  var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalHTML(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("Attribute runs can contain helpers", function() {
  var callbacks = [];

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callbacks.push(c);
      return this[path];
    }, this);
  });

  registerHelper('testing', function(path, options) {
    return boundValue(function(c) {
      callbacks.push(c);

      if (options.types[0] === 'id') {
        return this[path] + '.html';
      } else {
        return path;
      }
    }, this);
  });

  var context = { url: "example.com", path: 'index' };
  var fragment = compilesTo('<a href="http://{{url}}/{{testing path}}/{{testing "linky"}}">linky</a>', '<a href="http://example.com/index.html/linky">linky</a>', context);

  context.url = "www.example.com";
  context.path = "yep";
  callbacks.forEach(function(callback) { callback(); });

  equalHTML(fragment, '<a href="http://www.example.com/yep.html/linky">linky</a>');

  context.url = "nope.example.com";
  context.path = "nope";
  callbacks.forEach(function(callback) { callback(); });

  equalHTML(fragment, '<a href="http://nope.example.com/nope.html/linky">linky</a>');
});
*/
test("A simple block helper can return the default document fragment", function() {
  registerHelper('testing', function(context, params, options) {
    options.range.replace(options.render(context));
  });

  compilesTo('{{#testing}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

test("A simple block helper can return text", function() {
  registerHelper('testing', function(context, params, options) {
    options.range.replace(options.render(context));
  });

  compilesTo('{{#testing}}test{{/testing}}', 'test');
});

test("A block helper can have an else block", function() {
  registerHelper('testing', function(context, params, options) {
    options.range.replace(options.inverse(context));
  });

  compilesTo('{{#testing}}Nope{{else}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

test("A block helper can pass a context to be used in the child", function() {
  registerHelper('testing', function(context, params, options) {
    options.range.replace(options.render({ title: 'Rails is omakase' }, options));
  });

  compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
});

test("A block helper can insert the document fragment manually", function() {
  registerHelper('testing', function(context, params, options) {
    var frag = options.render({ title: 'Rails is omakase' }, options);
    options.element.appendChild(frag);
  });

  compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
});

test("Block helpers receive hash arguments", function() {
  registerHelper('testing', function(context, params, options) {
    if (options.hash.truth) {
      options.range.replace(options.render(context));
    }
  });

  compilesTo('{{#testing truth=true}}<p>Yep!</p>{{/testing}}{{#testing truth=false}}<p>Nope!</p>{{/testing}}', '<p>Yep!</p>');
});
/*

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
*/

test("Node helpers can modify the node", function() {
  registerHelper('testing', function(context, params, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('<div {{testing}}>Node helpers</div>', '<div zomg="zomg">Node helpers</div>');
});

test("Node helpers can be used for attribute bindings", function() {
  var callback;

  registerHelper('testing', function(context, params, options) {
    var path = options.hash.href,
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
