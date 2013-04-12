var set = Ember.set, get = Ember.get;
var view;

module("Ember.ViewUtils", {
  teardown: function() {
    Ember.run(function(){
      if (view) { view.destroy(); }
    });
  }
});

test("innerHTML for IE fix, original failing test in IE9", function() {
  var content = Ember.A();
  view = Ember.CollectionView.create({
    tagName: 'table',
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push('<td style="border: 2px solid red;">' + get(this, 'content.foo') + '</td>');
      }
    }),

    emptyView: Ember.View.extend({
      render: function(buf) {
        buf.push("<td>No Rows Yet</td>");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  equal(view.$('tr').length, 1, 'Make sure the empty view is there (regression)');

  Ember.run(function() {
    content.pushObject({foo : "bar"});
  });

  equal(view.$('tr').length, 1, 'has one row');
  equal(view.$('tr:nth-child(1) td').text(), 'bar', 'The content is the updated data.');
});

test("check that tags have read only innerHTML are handled correctly", function() {

  Ember.$("#qunit-fixture").append("<select id='select'></select>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#select")[0], "<option>testing</option>");} catch(e){}
  equal(Ember.$('#select>option').html(), 'testing', 'innerHTML worked on select tag');
  Ember.$("#qunit-fixture").empty();

  Ember.$("#qunit-fixture").append("<fieldset id='fieldset'></fieldset>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#fieldset")[0], "<legend>testing</legend>");} catch(e){}
  equal(Ember.$('#fieldset>legend').html(), 'testing', 'innerHTML worked on fieldset tag');
  Ember.$("#qunit-fixture").empty();

  Ember.$("#qunit-fixture").append("<table id='table'></table>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#table")[0], "<tbody><tr><td>testing</td></tr></tbody>");} catch(e){}
  equal(Ember.$('#table>tbody>tr>td').html(), 'testing', 'innerHTML worked on table tag');
  Ember.$("#qunit-fixture").empty();

  Ember.$("#qunit-fixture").append("<table><thead id='thead'></thead></table>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#thead")[0], "<tr><th>testing</th></tr>");} catch(e){}
  equal(Ember.$('#thead>tr>th').html(), 'testing', 'innerHTML worked on thead tag');
  Ember.$("#qunit-fixture").empty();

  Ember.$("#qunit-fixture").append("<table><tfoot id='tfoot'></tfoot></table>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#tfoot")[0], "<tr><td>testing</td></tr>");} catch(e){}
  equal(Ember.$('#tfoot>tr>td').html(), 'testing', 'innerHTML worked on tfoot tag');
  Ember.$("#qunit-fixture").empty();

  Ember.$("#qunit-fixture").append("<table><tbody id='tbody'></tbody></table>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#tbody")[0], "<tr><td>testing</td></tr>");} catch(e){}
  equal(Ember.$('#tbody>tr>td').html(), 'testing', 'innerHTML worked on tbody tag');
  Ember.$("#qunit-fixture").empty();

  Ember.$("#qunit-fixture").append("<table><tbody><tr id='tr'></tr></tbody></table>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#tr")[0], "<td>testing</td>");} catch(e){}
  equal(Ember.$('#tr>td').html(), 'testing', 'innerHTML worked on tr tag');
  Ember.$("#qunit-fixture").empty();

  Ember.$("#qunit-fixture").append("<table><tbody></tbody><colgroup id='colgroup'></colgroup></table>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#colgroup")[0], "<col>");} catch(e){}
  equal(Ember.$('#colgroup')[0].innerHTML.toUpperCase(), '<col>'.toUpperCase(), 'innerHTML worked on colgroup tag');
  Ember.$("#qunit-fixture").empty();

  Ember.$("#qunit-fixture").append("<map id='map'></map>");
  try {Ember.ViewUtils.setInnerHTML(Ember.$("#map")[0], "<area>");} catch(e){}
  equal(Ember.$('#map')[0].innerHTML.toUpperCase(), '<area>'.toUpperCase(), 'innerHTML worked on map tag');
  Ember.$("#qunit-fixture").empty();

});
