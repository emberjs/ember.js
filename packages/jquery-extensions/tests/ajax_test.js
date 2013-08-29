var jQuery = Ember.$, ajax = Ember.ajax, getJSON = Ember.getJSON, ajaxUrl, ajaxOptions, oldJQueryAjax;

function setupAjax() {
  ajaxUrl = undefined;
  ajaxOptions = undefined;
  oldJQueryAjax = jQuery.ajax;

  jQuery.ajax = function(options) {
    ajaxUrl = options.url;
    ajaxOptions = options;
  };
}

function teardownAjax() {
  jQuery.ajax = oldJQueryAjax;
}

if (Ember.FEATURES.isEnabled('ajax')) {

  module("Ember.ajax", {
    setup: setupAjax,
    teardown: teardownAjax
  });

  test('Ember.ajax exists', function() {
    ok(Ember.ajax);
  });

  test("Calling Ember.ajax() calls JQuery.ajax passing the same parameters", function() {

    ajax({ url: '/foo', type: 'GET', data: { extra: 'special' } });

    ok(ajaxOptions, 'jQuery.ajax was called');

    equal(ajaxOptions.url, '/foo', 'Request URL is the given value');
    equal(ajaxOptions.type, 'GET', 'Request method is the given value');
    equal(ajaxOptions.data.extra, 'special', 'Extra options are passed through');
    ajax('/foo', { type: 'POST' });
    equal(ajaxUrl, '/foo', 'First param match');
    equal(ajaxOptions.type, 'POST', 'Second param match');

  });

  test("Ember.ajax is a thennable", 4, function() {

    var promise = ajax('/foo');

    ok(promise instanceof Ember.RSVP.Promise, 'The return of Ember.ajax must be a instance of RSVP.Promise');

    promise.then(null, function(evt) {
      equal(evt.xhr.status, 404, 'The param of error promise callback is the jqXHR');
    });

    var errorThrown = 'Not Found',
    jqXHR = { status: 404 };

    ajaxOptions.error(jqXHR, 'error', errorThrown);

    ajax('/bar').then(function(evt) {
      equal(evt.data.name, 'Wycats', 'The param of success promise callback is the data returned by the server');
    });

    var data = { name: 'Wycats' };
    jqXHR = { status: 200 };

    ajaxOptions.success(data, 'success', jqXHR);

    ajax('/foo').then(function() {
      throw new Error();
    }).fail(function() {
      ok(true, 'An error in success callback must be propagated to failure');
    });

    ajaxOptions.success(data, 'success', jqXHR);

  });

  test("Validation of ajax options", function() {

    expectAssertion(function() {
      ajax('/foo', { success: Ember.K });
    }, /The success and error options are not allowed./);

    expectAssertion(function() {
      ajax('/foo', { error: Ember.K });
    }, /The success and error options are not allowed./);

    expectAssertion(function() {
      ajax();
    }, /The url must be present/);
  });

  module("Ember.getJSON", {
    setup: setupAjax,
    teardown: teardownAjax
  });

  test('Ember.getJSON exists', function() {
    ok(Ember.getJSON);
  });

  test('Validation of getJSON options', 11, function() {
    expectAssertion(function() {
      getJSON();
    }, /The url must be present/);

    getJSON('/post', 'PUT');

    equal(ajaxUrl, '/post', 'First param is the url, when using two args');
    equal(ajaxOptions.type, 'PUT', 'Second param is the options type, when using two args');

    var options = { data: { foo: 'bar'}, async: true, headers: { foo: 'bar' } };

    getJSON('/posts', 'POST', options);

    equal(ajaxUrl, '/posts', 'First param is the url, when using three args');
    equal(ajaxOptions.type, 'POST', 'Second param is the options type, when using three args');
    equal(ajaxOptions.async, true, 'Third param is the options itself, when using three args');
    ok(ajaxOptions.headers !== options.headers, 'Options hash is deep cloned');

    equal(ajaxOptions.data, JSON.stringify({ foo: 'bar' }), 'The data from third param is stringified, when using three args');

    getJSON('/foo', { data: { foo: 'bar'}, async: true });

    equal(ajaxUrl, '/foo', 'First param is the url, when using two args');
    equal(ajaxOptions.async, true, 'Second param is the options itself, when using two args');
    equal(ajaxOptions.data.foo, 'bar', 'The data from third param is preserved, when using two args');
  });

  test('It perform json requests', 9, function() {

    var data = { name: 'Tom' },
    post = { title: 'Rails is omasake' },
    jqXHR = { status: 200 };

    getJSON('/post/1', { data: data }).then(function(post) {
      equal(post.title, 'Rails is omasake', 'The requested data is present');
    });

    equal(ajaxOptions.dataType, 'json', 'The dataType must be json');
    deepEqual(ajaxOptions.data, data, 'The sent data is preserved');

    ajaxOptions.success(post, 'success', jqXHR);

    getJSON('/post', 'PUT', { data: data }).then(function(post) {
      equal(post.title, 'Rails is omasake', 'The requested data is present');
    });

    equal(ajaxOptions.contentType, 'application/json; charset=utf-8', 'The content type match');
    equal(ajaxOptions.data, JSON.stringify({ name: 'Tom' }), 'The sent data is stringified');

    ajaxOptions.success(post, 'success', jqXHR);

    jqXHR = { status: 404 };

    getJSON('/unknow', 'PUT', { data: data }).then(null, function(evt) {
      equal(evt.xhr.status, 404, 'The xhr status match');
      equal(evt.textStatus, 'error', 'The text status match');
      equal(evt.errorThrown, 'Not found', 'The errorThrown match');
    });

    ajaxOptions.error(jqXHR, 'error', 'Not found');

  });

}