module("Ember Error Throwing");

test("new Ember.Error displays provided message", function() {
  raises( function(){
    throw new Ember.Error('A Message');
  }, function(e){
    return e.message === 'A Message';
  }, 'the assigned message was displayed' );
});
