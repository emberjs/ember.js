module("test Ember.Handlebars.bootstrap");

test("templates located in head with data-template-name should add a new template to Ember.TEMPLATES", function() {
	$('#qunit-fixture').html( '<head><script type="text/html" data-template-name="crazyTemplate" >{{App.version}}</script></head>' );
	Ember.Handlebars.bootstrap( $('#qunit-fixture') );
	
	ok( Ember.TEMPLATES['crazyTemplate'] );
});