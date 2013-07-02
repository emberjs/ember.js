var HttpResponse = function(xhr, textStatus, content) {
  this.status = xhr.status;
  this.textStatus = textStatus;
  this.content = content || xhr.responseText;
  this.header = function(header) {
    return xhr.getResponseHeader(header);
  };
  this.isSuccess = arguments.length === 3;
};

var http = function(url, method, options) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    options = options || {};
    options.url = url;
    options.type = method;
    options.dataType = options.dataType || 'json';

    if (options.dataType === 'json' && options.data && method !== 'GET') {
      options.contentType = 'application/json; charset=utf-8';
      options.data = JSON.stringify(options.data);
    }

    if (options.success || options.error) {
      throw new Error("http should use promises, received 'success' or 'error' callback");
    }

    options.success = function(data, textStatus, xhr) {
      var response = new HttpResponse(xhr, textStatus, data);

      Ember.run(null, resolve, response);
    };

    options.error = function(xhr, textStatus) {
      var response = new HttpResponse(xhr, textStatus);

      if (response.textStatus === 'error' && response.status < 500) {
        Ember.run(null, resolve, response);
      } else {
        Ember.run(null, reject, response);
      }
    };

    Ember.$.ajax(options);
  });
};

function rejectOnError(response) {
  if (!response.isSuccess) {
    throw response;
  }
  return response;
}

function requestWithData(method) {
  return function(url, data, options) {
    options = options || {};
    options.data = data;
    return http(url, method, options).then(rejectOnError);
  };
}

function request(method) {
  return function(url, options) {
    return http(url, method, options).then(rejectOnError);
  };
}

http.get = request('GET');
http.head = request('HEAD');
http['delete'] = request('DELETE');

http.post = requestWithData('POST');
http.put = requestWithData('PUT');
http.patch = requestWithData('PATCH');

http.getScript = function(url) {
  return http.get(url, { dataType: 'script' });
};

http.getImage = function(url) {
  return http.get(url, { dataType: 'image' });
};

Ember.$.ajaxTransport('image', function(options) {
  if (options.type === 'GET' && options.async) {
    return {
      send: function(_ , callback) {
        var img = Ember.$('<img>', { src: options.url });
        this.abort = function() {
          img.off('load error');
        };
        img.on('load', function() {
          Ember.run(null, callback, 200, 'success', this);
        }).on('error', function() {
          Ember.run(null, callback, 404, 'error');
        });
      },
      abort: function() {}
    };
  }
});

Ember.HttpResponse = HttpResponse;
Ember.http = http;
