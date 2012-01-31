(function(window,$){

  var APIDoc;

  // jQuery Extensions
  $.expr[':'].Contains = function(a,i,m){
      return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase())>=0;
  };

  // functions
  function setPage() {
    var state = jQuery.bbq.getState();
    if (state.doc) {
        loadPageContent(state);
    }
  }

  function loadPageContent(state) {
    var url = state.doc;
    var src = state.src;
    var method = state.method;
    var elem;
    if (src === "false" || src === undefined) {
      if (url)  {
        oldUrl = url;
        url = "symbols/" + url + ".html";
        console.log(url)
      } else {
        oldUrl = "API Documentation Index";
      }
      $("[role=main]").load("/"+url+ " #documentation", function(){
        $("body").scrollTop(0);
        var scrollTo = $("#list span").removeClass("active").filter(function() {
          return this.firstChild.firstChild.nodeValue === oldUrl;
        }).addClass("active").offset().top;
        currentOffset = $("#list div").scrollTop();
        $("#list div").animate({ scrollTop: currentOffset + scrollTo - 102});
        if (method) {
          scrollDocsTo(method);
        }
      });

    } else {
      url = "symbols/src/" + url  + ".html";
      elem = $("[role=main] #documentation").load("/"+url, function(){ elem.scrollTop(0); });
    }
  }

  function zebraStripeList() {
    $("#list").find("a:contains(All Classes)").parent("span").show();
    $("#list span").removeClass("even").removeClass("odd");
    $("#list span:visible:odd").addClass("odd");
    $("#list span:visible:even").addClass("even");
  }

  function filterList(){
    $("input").
      change(function(){
        // The following code has been adapted from http://kilianvalkhof.com/2010/javascript/how-to-build-a-fast-simple-list-filter-with-jquery/ 
        var filter = $(this).val();
        if (filter) {
          $("#list").find("a:not(:Contains(" + filter + "))").parents("span").hide();
          $("#list").find("a:Contains(" + filter + ")").parents("span").show();
        } else {
          $("#list").find("span").show();
        }
        zebraStripeList();
      }).keyup(function(){
        $(this).change();
    });
  }
  function scrollDocsTo(elem) {
    elem = $("[name='" + elem + "']").next(); // In Chrome <a name> tags have an offset of 0x0 so use the next element
    elem.closest("#documentation").animate({scrollTop: elem.parent().scrollTop() + elem.offset().top - 56 });
  }

  function run(){
    setPage();
    zebraStripeList();
    filterList();

    $(window).bind( 'hashchange', function(e) {
      setPage();
    })
    $("[role=search] a").click(function() {
      $("input").val("").change();
      return false;
    });

    $("#list a, #documentation a").live("click",function() {
      var url = $(this).attr("href");
      if (url.match(/src/)) {
        var url = $(this).attr("href").replace(/(\.\.|symbols|src|\/|\.html)/g, "" );

        $.bbq.pushState({
          doc: url,
          src: true
        }, 2);
      } else if (url.match(/#/)) {
        var location = $(this).attr("href").replace(/.*\#/,"");
        scrollDocsTo(location);
        $.bbq.pushState({ 
          method: location
        })
      } else {
        url = url.replace(/(\.\.|symbols|\/|\.html)/g, "" );
        $.bbq.pushState({
          doc: url,
          src: false
        }, 2);
      }

      return false;
    });
  }

  // Define Api
  window.APIDoc = {
    'run':              run,
    'setPage':          setPage,
    'loadPageContent':  loadPageContent,
    'zebraStripeList':  zebraStripeList,
    'scrollDocsTo':     scrollDocsTo
  };



})(window,jQuery);


$(function(){
  APIDoc.run();
});

