/*global jQuery Benchmark BenchWarmer:true*/

var embers = {
  before: "../lib/ember.js",
  after: "../dist/ember.prod.js"
};

function makeiframe(emberPath, suitePath, profile, callback) {
  var iframe = jQuery("<iframe>").appendTo("body")[0];
  var write = function(str) { iframe.contentDocument.write(str); };

  var name = emberPath + ": " + suitePath;
  iframe.name = name;

  write("<title>" + name + "</title>");
  write("<script src='../lib/jquery-1.7.2.js'></script>");
  write("<script src='" + emberPath + "'></script>");
  write("<script src='benchmark.js'></script>");
  write("<script src='iframe_runner.js'></script>");
  write("<applet code='nano' archive='nano.jar'></applet>");

  var bench, before;

  var logger = function(string) {
    jQuery("[data-ember-path='" + emberPath + "']").html(emberPath + ": " + string);
  };

  setTimeout(function() {
    jQuery.ajax({
      url: suitePath,
      async: false,
      dataType: 'text',
      complete: function(xhr) {
        var bench = iframe.contentWindow.BenchWarmer.evalString(xhr.responseText, emberPath, logger, profile);
        callback(bench);
      }
    });
  }, 2000);
}

jQuery(function() {

  var query = window.location.search;
  var decoded = decodeURIComponent(query).slice(1).split(/[&=]/);

  var options = {};

  // Parse query string for options
  for (var i=0, l=decoded.length; i<l; i+=2) {
    options[decoded[i]] = decoded[i + 1];
  }

  var beforeBench, afterBench;

  makeiframe(embers.before, "suites/" + options.suitePath, options.profile, function(bench) {
    beforeBench = bench;

    makeiframe(embers.after, "suites/" + options.suitePath, options.profile, function(bench) {
      afterBench = bench;
      beforeBench.next = afterBench;
      beforeBench.run();
    });
  });
});
