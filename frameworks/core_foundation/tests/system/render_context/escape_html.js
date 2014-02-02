// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context */
module("Render Context--Escaping HTML");
test("Escaping HTML", function() {
  var input = "<p>HTML!</p><script>alert('hi');<" + "/script> & Hello, World!";
  var output = SC.RenderContext.escapeHTML(input);
  
  equals(output, '&lt;p&gt;HTML!&lt;/p&gt;&lt;script&gt;alert(\'hi\');&lt;/script&gt; &amp; Hello, World!', "Properly escapes HTML");
});

module("Render Context--Escaping , preserve HTML entities like &apos;");
test("Escaping HTML, preserve HTML entities", function() {
  var input = "<p>HTML!</p><script>alert('hi');<" + "/script> &illegalese; & &amp; Hello, World!";
  var output = SC.RenderContext.escapeHTML(input);
  
  equals(output, '&lt;p&gt;HTML!&lt;/p&gt;&lt;script&gt;alert(\'hi\');&lt;/script&gt; &amp;illegalese; &amp; &amp; Hello, World!', "Properly escapes HTML");
});

test("Tests stolen from Prototype.js", function() {
  var largeTextEscaped = '&lt;span&gt;test&lt;/span&gt;', 
      largeTextUnescaped = '<span>test</span>';
  for (var i = 0; i < 2048; i++) { 
    largeTextEscaped += ' ABC';
    largeTextUnescaped += ' ABC';
  }
  
  
  var tests = [
    'foo bar', 'foo bar',
    'foo <span>bar</span>', 'foo &lt;span&gt;bar&lt;/span&gt;',
    'foo ß bar', 'foo ß bar',
    'ウィメンズ2007\nクルーズコレクション', 'ウィメンズ2007\nクルーズコレクション',
    'a<a href="blah">blub</a>b<span><div></div></span>cdef<strong>!!!!</strong>g',
      'a&lt;a href="blah"&gt;blub&lt;/a&gt;b&lt;span&gt;&lt;div&gt;&lt;/div&gt;&lt;/span&gt;cdef&lt;strong&gt;!!!!&lt;/strong&gt;g',
    '1\n2', '1\n2',
    
    largeTextUnescaped, largeTextEscaped
  ];
  
  for (var idx = 0; idx < tests.length; idx++) {
    // some of these strings are REALLY LONG so we don't want to write them out
    ok(SC.RenderContext.escapeHTML(tests[idx++]) === tests[idx]);
  }
});

test("Should accept number argument", function() {
  var number = 12345.6789,
      numStr = number.toString();
  
  equals(numStr, SC.RenderContext.escapeHTML(number), "Properly produces string when invoked with a number argument");
});
