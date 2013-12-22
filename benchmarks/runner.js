/*global jQuery Benchmark BenchWarmer:true*/

var embers = {
  before: "../distold/ember.prod.js",
  after: "../dist/ember.prod.js"
};

function makeiframe(emberPath, suitePath, suiteCode, profile, callback) {
  var iframe = jQuery("<iframe>").appendTo("body")[0];
  var write = function(str) { iframe.contentDocument.write(str); };

  var name = emberPath + ": " + suitePath;
  iframe.name = name;

  write("<title>" + name + "</title>");
  write("<script src='http://code.jquery.com/jquery-1.10.1.min.js'></script>");
  write("<script>ENV = {VIEW_PRESERVES_CONTEXT: true};</script>");
  write("<script src='//cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.1.2/handlebars.min.js'></script>");
  write("<script src='" + emberPath + "'></script>");
  write("<script src='benchmark.js'></script>");
  write("<script src='iframe_runner.js'></script>");
  write("<applet code='nano' archive='nano.jar'></applet>");

  var bench, before;

  var logger = function(string) {
    jQuery("[data-ember-path='" + emberPath + "']").html(emberPath + ": " + string);
  };

  function wait() {
    if ('BenchWarmer' in iframe.contentWindow) {
      var bench = iframe.contentWindow.BenchWarmer.evalString(suiteCode, emberPath, logger, profile);
      callback(bench);
    } else {
      setTimeout(wait, 100);
    }
  }

  wait();
}

function loadSuite(suitePath, callback) {
  function fail() {
    jQuery('#error').text('Failed to load suite: '+suitePath);
  }

  jQuery.ajax({
    url: suitePath,
    async: false,
    dataType: 'text'
  }).then(callback, fail);
}

jQuery(function() {

  var query = window.location.search;
  var decoded = decodeURIComponent(query).slice(1).split(/[&=]/);

  var options = {};

  // Parse query string for options
  for (var i=0, l=decoded.length; i<l; i+=2) {
    options[decoded[i]] = decoded[i + 1];
  }

  var suitePath = "suites/" + options.suitePath;

  loadSuite(suitePath, function (suiteCode) {
    var beforeBench, afterBench;

    makeiframe(embers.before, suitePath, suiteCode, options.profile, function(bench) {
      beforeBench = bench;

      makeiframe(embers.after, suitePath, suiteCode, options.profile, function(bench) {
        afterBench = bench;
        beforeBench.next = afterBench;
        beforeBench.run();
      });
    });
  });
});
