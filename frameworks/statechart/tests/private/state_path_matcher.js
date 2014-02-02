// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var state1, state2;
module("SC.StatePathMatcher: match Tests", {
  setup: function() {
    state1 = SC.Object.create({
      substates: [
        SC.Object.create({ name: 'a' })
      ]
    });

    state2 = SC.Object.create({
      substates: [
        SC.Object.create({ name: 'b' })
      ]
    });
  },
  
  teardown: function() {
    state1 = state2 = null;
  }

});

test("test with expresson 'a'", function() {
  var spm = SC.StatePathMatcher.create({ expression: 'a' });
  ok(spm.match('a'), "should match 'a'");
  ok(spm.match('b.a'), "should match 'b.a'");

  ok(!spm.match('b'), "should not match 'b'");
  ok(!spm.match('a.b'), "should not match 'a.b'"); 
});

test("test with expresson 'a.b'", function() {
  var spm = SC.StatePathMatcher.create({ expression: 'a.b' });
  ok(spm.match('a.b'), "should match 'a.b'");
  ok(spm.match('x.a.b'), "should match 'x.a.b'");

  ok(!spm.match('b'), "should not match 'b'");
  ok(!spm.match('a'), "should not match 'a'");
  ok(!spm.match('b.a'), "should not match 'b.a'");
  ok(!spm.match('a.b.x'), "should not match 'a.b.x'"); 
});

test("test with expresson 'a~b'", function() {
  var spm = SC.StatePathMatcher.create({ expression: 'a~b' });
  ok(spm.match('a.b'), "should match 'a.b'");
  ok(spm.match('a.x.b'), "should match 'a.x.b'");
  ok(spm.match('a.x.y.b'), "should match 'a.x.y.b'");
  ok(spm.match('x.a.b'), "should match 'x.a.b'");
  ok(spm.match('x.a.y.b'), "should match 'x.a.y.b'");

  ok(!spm.match('b'), "should not match 'b'");
  ok(!spm.match('a'), "should not match 'a'");
  ok(!spm.match('a.b.x'), "should not match 'a.b.x'"); 
  ok(!spm.match('a.y.b.x'), "should not match 'a.y.b.x'"); 
  ok(!spm.match('y.a.b.x'), "should not match 'y.a.b.x'"); 
});

test("test with expresson 'a.b~c.d'", function() {
  var spm = SC.StatePathMatcher.create({ expression: 'a.b~c.d' });
  ok(spm.match('a.b.c.d'), "should match 'a.b.c.d'");
  ok(spm.match('a.b.x.c.d'), "should match 'a.b.x.c.d'");
  ok(spm.match('a.b.x.y.c.d'), "should match 'a.b.x.y.c.d'");
  ok(spm.match('z.a.b.x.y.c.d'), "should match 'z.a.b.x.y.c.d'");

  ok(!spm.match('a.b.c.d.x'), "should not match 'a.b.c.d.x'");
  ok(!spm.match('b.c.d'), "should not match 'b.c.d'");
  ok(!spm.match('a.b.c'), "should not match 'a.b.c'");
  ok(!spm.match('a.b.d'), "should not match 'a.b.d'");
  ok(!spm.match('a.c.d'), "should not match 'a.c.d'");
  ok(!spm.match('a.b.y.c.d.x'), "should not match 'a.b.y.c.d.x'"); 
});

test("test with expresson 'this.a'", function() {
  var spm = SC.StatePathMatcher.create({ expression: 'this.a' });
  
  spm.set('state', state1);
   
  ok(spm.match('a'), "should match 'a' for state1");
  ok(!spm.match('b'), "should not match 'b' for state1");
  ok(!spm.match('a.b'), "should not match 'a.b' for state1");
  
  spm.set('state', state2);
  
  ok(!spm.match('a'), "should not match 'a' for state2"); 
   
});

test("test with expresson 'this.a.b'", function() {
  var spm = SC.StatePathMatcher.create({ expression: 'this.a.b' });
  
  spm.set('state', state1);

  ok(spm.match('a.b'), "should match 'a.b'");
  ok(!spm.match('a'), "should not match 'a'");
  ok(!spm.match('b'), "should not match 'b'");
   
});

test("test with expresson 'this.a~b'", function() {
  var spm = SC.StatePathMatcher.create({ expression: 'this.a~b' });
  
  spm.set('state', state1);

  ok(spm.match('a.b'), "should match 'a.b'");
  ok(spm.match('a.x.b'), "should match 'a.x.b'");
  
  ok(!spm.match('a'), "should not match 'a'");
  ok(!spm.match('b'), "should not match 'b'");
  ok(!spm.match('b.a'), "should not match 'b.a'");
   
});