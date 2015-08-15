/* jshint scripturl:true */

import isEnabled from 'ember-metal/features';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { SafeString } from 'ember-htmlbars/utils/string';
import { runDestroy } from 'ember-runtime/tests/utils';
import environment from 'ember-metal/environment';

var view;

QUnit.module('ember-htmlbars: sanitized attribute', {
  teardown() {
    runDestroy(view);
  }
});

// jscs:disable disallowTrailingWhitespace
var badTags = [
  { tag: 'a', attr: 'href',
    unquotedTemplate: compile('<a href={{url}}></a>'),
    quotedTemplate: compile('<a href=\'{{url}}\'></a>'),
    multipartTemplate: compile('<a href=\'{{protocol}}{{path}}\'></a>') },

  { tag: 'base', attr: 'href',
    unquotedTemplate: compile('<base href={{url}} />'),
    quotedTemplate: compile('<base href=\'{{url}}\'/>'),
    multipartTemplate: compile('<base href=\'{{protocol}}{{path}}\'/>') },

  { tag: 'embed', attr: 'src',
    unquotedTemplate: compile('<embed src={{url}} />'),
    quotedTemplate: compile('<embed src=\'{{url}}\'/>'),
    multipartTemplate: compile('<embed src=\'{{protocol}}{{path}}\'/>') },

  { tag: 'body', attr: 'background',
    unquotedTemplate: compile('<body background={{url}}></body>'),
    quotedTemplate: compile('<body background=\'{{url}}\'></body>'),
    multipartTemplate: compile('<body background=\'{{protocol}}{{path}}\'></body>') },

  { tag: 'link', attr: 'href',
    unquotedTemplate: compile('<link href={{url}}>'),
    quotedTemplate: compile('<link href=\'{{url}}\'>'),
    multipartTemplate: compile('<link href=\'{{protocol}}{{path}}\'>') },

  { tag: 'img', attr: 'src',
    unquotedTemplate: compile('<img src={{url}}>'),
    quotedTemplate: compile('<img src=\'{{url}}\'>'),
    multipartTemplate: compile('<img src=\'{{protocol}}{{path}}\'>') },

  { tag: 'iframe', attr: 'src',
    // Setting an iframe with a bad protocol results in the browser
    // being redirected. in IE8. Skip the iframe tests on that platform.
    skip: (environment.hasDOM && document.documentMode && document.documentMode <= 8),
    unquotedTemplate: compile('<iframe src={{url}}></iframe>'),
    quotedTemplate: compile('<iframe src=\'{{url}}\'></iframe>'),
    multipartTemplate: compile('<iframe src=\'{{protocol}}{{path}}\'></iframe>') }
];

for (var i = 0, l = badTags.length; i < l; i++) {
  (function() {
    var subject = badTags[i];

    if (subject.skip) {
      return;
    }

    QUnit.test(`${subject.tag} ${subject.attr} is sanitized when using blacklisted protocol`, function() {
      view = EmberView.create({
        context: { url: 'javascript://example.com' },
        template: subject.unquotedTemplate
      });

      view.createElement();

      equal(view.element.firstChild.getAttribute(subject.attr),
            'unsafe:javascript://example.com',
            'attribute is output');
    });

    QUnit.test(`${subject.tag} ${subject.attr} is sanitized when using quoted non-whitelisted protocol`, function() {
      view = EmberView.create({
        context: { url: 'javascript://example.com' },
        template: subject.quotedTemplate
      });

      view.createElement();

      equal(view.element.firstChild.getAttribute(subject.attr),
            'unsafe:javascript://example.com',
            'attribute is output');
    });

    QUnit.test(`${subject.tag} ${subject.attr} is not sanitized when using non-whitelisted protocol with a SafeString`, function() {
      view = EmberView.create({
        context: { url: new SafeString('javascript://example.com') },
        template: subject.unquotedTemplate
      });

      try {
        view.createElement();

        equal(view.element.firstChild.getAttribute(subject.attr),
              'javascript://example.com',
              'attribute is output');
      } catch(e) {
        // IE does not allow javascript: to be set on img src
        ok(true, 'caught exception ' + e);
      }
    });

    QUnit.test(`${subject.tag} ${subject.attr} is sanitized when using quoted+concat non-whitelisted protocol`, function() {
      view = EmberView.create({
        context: { protocol: 'javascript:', path: '//example.com' },
        template: subject.multipartTemplate
      });
      view.createElement();

      equal(view.element.firstChild.getAttribute(subject.attr),
            'unsafe:javascript://example.com',
            'attribute is output');
    });
  })(); //jshint ignore:line
}
// jscs:enable disallowTrailingWhitespace
