import { TemplateCompiler } from "htmlbars/compiler/template";
module helpers from "htmlbars/runtime/helpers";

var helpers = {RESOLVE: helpers.RESOLVE};

module("TemplateCompiler");

test("it works", function testFunction() {
  var compiler =  new TemplateCompiler();
  var template = compiler.compile("<div>{{foo}} {{bar}}</div>");
  var fragment = template({foo: "zomg", bar: "amazing"}, {helpers: helpers});

  var html = fragment.childNodes[0].outerHTML;
  equal(html, "<div>zomg amazing</div>", html);

  // var div = document.createElement('div');

  // console.profile();
  // var start = Date.now();
  // for (var i = 0, l = 100000; i < l; i++) {
  //   div.insertBefore(template({foo: "zomg" + i, bar: "amazing" + i}));
  // }

  // document.body.insertBefore(div);
  // console.profileEnd();
  // console.log(Date.now() - start);
});