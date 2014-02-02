// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var obj, monitor, rootState, a, b, c, d, e, m, n, o, p, x, y;

module("SC.Statechart: Destroy Statechart Tests", {
  setup: function() {
    
    obj = SC.Object.create(SC.StatechartManager, {
      
      initialState: 'A',
      A: SC.State.design(),
      B: SC.State.design(),
      C: SC.State.design(),
      D: SC.State.design(),
      E: SC.State.design(),
      M: SC.State.design(),
      N: SC.State.design(),
      O: SC.State.design(),
      P: SC.State.design(),
      X: SC.State.design(),
      Y: SC.State.design()
      
    });
    
    obj.initStatechart();
    rootState = obj.get('rootState');
    a = obj.getState('A');
    b = obj.getState('B');
    c = obj.getState('C');
    d = obj.getState('D');
    e = obj.getState('E');
    m = obj.getState('M');
    n = obj.getState('N');
    o = obj.getState('O');
    p = obj.getState('P');
    x = obj.getState('X');
    y = obj.getState('Y');
    
    monitor = SC.StatechartMonitor.create({ statechart: obj });
  },
  
  teardown: function() {
    obj = monitor = rootState = null;
    a = b = c = d = e = m = n = o = p = x = y = null;
  }
});

test("match against sequence entered A", function() {
  monitor.pushEnteredState(a);
  
  var matcher = monitor.matchSequence();
  
  ok(matcher.begin().entered(a).end(), "should match entered A");
  ok(matcher.begin().entered('A').end(), "should match entered 'A'");
  ok(!matcher.begin().entered(b).end(), "should not match entered B");
  ok(!matcher.begin().exited(a).end(), "should not match exited A");
  ok(!matcher.begin().exited(b).end(), "should not match exited B");
  ok(!matcher.begin().entered(a, b).end(), "should not match entered [A, B]");
  ok(!matcher.begin().entered(a).entered(b).end(), "should not match entered A, entered B");
});

test("match against sequence exited A", function() {
  monitor.pushExitedState(a);
  
  var matcher = monitor.matchSequence();
  
  ok(matcher.begin().exited(a).end(), "should match exited A");
  ok(matcher.begin().exited('A').end(), "should match exited 'A'");
  ok(!matcher.begin().exited(b).end(), "should not match exited B");
  ok(!matcher.begin().entered(a).end(), "should not match entered A");
  ok(!matcher.begin().entered(b).end(), "should not match entered B");
  ok(!matcher.begin().exited(a, b).end(), "should not match exited [A, B]");
  ok(!matcher.begin().exited(a).exited(b).end(), "should not match exited A, exited B");
});

test("match against sequence entered A, entered B", function() {
  monitor.pushEnteredState(a);
  monitor.pushEnteredState(b);
  
  var matcher = monitor.matchSequence();
  
  ok(matcher.begin().entered(a, b).end(), "should match entered [A, B]");
  ok(matcher.begin().entered('A', 'B').end(), "should match entered ['A', 'B']");
  ok(matcher.begin().entered(a).entered(b).end(), "should match entered A, entered B");
  ok(!matcher.begin().entered(a).end(), "should not match entered A");
  ok(!matcher.begin().entered(b).end(), "should not match entered B");
  ok(!matcher.begin().entered(b, a).end(), "should not match entered [B, A]");
  ok(!matcher.begin().entered('B', 'A').end(), "should match entered ['B', 'A']");
  ok(!matcher.begin().entered(b).entered(a).end(), "should not matched entered B, entered A");
  ok(!matcher.begin().entered(a, c).end(), "should not match entered [A, C]");
  ok(!matcher.begin().entered('A', 'C').end(), "should not match entered [A, C]");
  ok(!matcher.begin().entered(a).entered(c).end(), "should not match entered A, entered C");
  ok(!matcher.begin().entered(a, b, c).end(), "should not match entered [A, B, C]");
});

test("match against sequence exited A, exited B", function() {
  monitor.pushExitedState(a);
  monitor.pushExitedState(b);
  
  var matcher = monitor.matchSequence();
  
  ok(matcher.begin().exited(a, b).end(), "should match exited [A, B]");
  ok(matcher.begin().exited('A', 'B').end(), "should match exited ['A', 'B']");
  ok(matcher.begin().exited(a).exited(b).end(), "should match exited A, entered B");
  ok(!matcher.begin().exited(a).end(), "should not match exited A");
  ok(!matcher.begin().exited(b).end(), "should not match exited B");
  ok(!matcher.begin().exited(b, a).end(), "should not match exited [B, A]");
  ok(!matcher.begin().exited('B', 'A').end(), "should not match exited ['B', 'A']");
  ok(!matcher.begin().exited(b).exited(a).end(), "should not matched exited B, exited A");
  ok(!matcher.begin().exited(a, c).end(), "should not match exited [A, C]");
  ok(!matcher.begin().exited('A', 'C').end(), "should not match exited ['A', 'C']");
  ok(!matcher.begin().exited(a).exited(c).end(), "should not match exited A, exited C");
});

test("match against sequence exited A, entered B", function() {
  monitor.pushExitedState(a);
  monitor.pushEnteredState(b);
  
  var matcher = monitor.matchSequence();
  
  ok(matcher.begin().exited(a).entered(b).end(), "should match exited A, entered B");
  ok(matcher.begin().exited('A').entered('B').end(), "should match exited 'A', entered 'B'");
  ok(!matcher.begin().entered(a).exited(a).end(), "should not match entered A, exited B");
  ok(!matcher.begin().entered('A').exited('B').end(), "should not match entered 'A', exited 'B'");
  ok(!matcher.begin().exited(a).entered(c).end(), "should not match exited A, entered C");
  ok(!matcher.begin().exited(a).entered(b, c).end(), "should not match exited A, entered [B, C]");
  ok(!matcher.begin().exited(a).entered(b).entered(c).end(), "should not match exited A, entered B, entered C");
  ok(!matcher.begin().exited(a).entered(b).exited(c).end(), "should not match exited A, entered B, exited C");
});

test("match against sequence seq(enter A), seq(enter B)", function() {
  monitor.pushEnteredState(a);
  monitor.pushEnteredState(b);
  
  var matcher = monitor.matchSequence();
  
  matcher.begin()
    .beginSequence()
      .entered(a)
    .endSequence()
    .beginSequence()
      .entered(b)
    .endSequence()
  .end();
  
  ok(matcher.get('match'), "should match seq(entered A), seq(entered B)");
  
  matcher.begin()
    .beginSequence()
      .entered(a)
      .entered(b)
    .endSequence()
  .end();
  
  ok(matcher.get('match'), "should match seq(entered A, entered B)");
  
  matcher.begin()
    .beginSequence()
      .entered(a)
      .entered(b)
    .endSequence()
  .end();
  
  ok(matcher.get('match'), "should match seq(entered A, entered B)");
  
  matcher.begin()
    .beginSequence()
      .entered(a, b)
    .endSequence()
  .end();
  
  ok(matcher.get('match'), "should match seq(entered [A, B]");
  
  matcher.begin()
    .beginSequence()
      .entered(a)
    .endSequence()
  .end();
  
  ok(!matcher.get('match'), "should not match seq(entered A)");
  
  matcher.begin()
    .beginSequence()
      .entered(a)
    .endSequence()
    .beginSequence()
      .entered(c)
    .endSequence()
  .end();
  
  ok(!matcher.get('match'), "should not match seq(entered A), seq(entered C)");
  
  matcher.begin()
    .beginSequence()
      .entered(a)
    .endSequence()
    .beginSequence()
      .entered(b)
    .endSequence()
    .beginSequence()
      .entered(c)
    .endSequence()
  .end();
  
  ok(!matcher.get('match'), "should not match seq(entered A), seq(entered B), seq(entered C)");
});

test("match against sequence con(entered A)", function() {
  monitor.pushEnteredState(a);
  
  var matcher = monitor.matchSequence();
  
  matcher.begin()
     .beginConcurrent()
       .entered(a)
     .endConcurrent()
   .end();
   
   ok(matcher.get('match'), "should match con(entered A)");
   
   matcher.begin()
    .beginConcurrent()
      .beginSequence()
        .entered(a)
      .endSequence()
    .endConcurrent()
  .end();

  ok(matcher.get('match'), "should match con(seq(entered A))");
   
  matcher.begin()
    .beginConcurrent()
      .entered(b)
    .endConcurrent()
  .end();
   
  ok(!matcher.get('match'), "should match con(entered B)");
   
  matcher.begin()
    .beginConcurrent()
      .exited(a)
    .endConcurrent()
  .end();
   
  ok(!matcher.get('match'), "should match con(exited B)");
  
  matcher.begin()
    .beginConcurrent()
      .entered(a)
      .entered(b)
    .endConcurrent()
  .end();
  
  ok(!matcher.get('match'), "should not match con(entered A, entered B)");
  
  matcher.begin()
    .beginConcurrent()
      .entered(b)
      .entered(a)
    .endConcurrent()
  .end();
  
  ok(!matcher.get('match'), "should not match con(entered B, entered A)");
});

test("match against sequence con(entered A entered B)", function() {
  monitor.pushEnteredState(a);
  monitor.pushEnteredState(b);
  
  var matcher = monitor.matchSequence();
  
  matcher.begin()
    .beginConcurrent()
      .entered(a)
      .entered(b)
    .endConcurrent()
  .end();
   
  ok(matcher.get('match'), "should match con(entered A, entered B)");
  
  matcher.begin()
    .beginConcurrent()
      .entered(b)
      .entered(a)
    .endConcurrent()
  .end();
   
  ok(matcher.get('match'), "should match con(entered B, entered A)");
  
  matcher.begin()
    .beginConcurrent()
      .beginSequence()
        .entered(a)
      .endSequence()
      .entered(b)
    .endConcurrent()
  .end();
   
  ok(matcher.get('match'), "should match con(seq(entered A), entered B)");
  
  matcher.begin()
    .beginConcurrent()
      .beginSequence()
        .entered(a)
      .endSequence()
      .beginSequence()
        .entered(b)
      .endSequence()
    .endConcurrent()
  .end();
   
  ok(matcher.get('match'), "should match con(seq(entered A), seq(entered B))");
  
  matcher.begin()
    .beginConcurrent()
      .entered(a, b)
    .endConcurrent()
  .end();
   
  ok(matcher.get('match'), "should match con(entered [A, B])");
  
  matcher.begin()
    .beginConcurrent()
      .beginSequence()
        .entered(a)
        .entered(b)
      .endSequence()
    .endConcurrent()
  .end();
   
  ok(matcher.get('match'), "should match con(entered [A, B])");
  
  matcher.begin()
    .beginConcurrent()
      .entered(a)
    .endConcurrent()
  .end();
   
  ok(!matcher.get('match'), "should not match con(entered A])");
  
  matcher.begin()
    .beginConcurrent()
      .entered(a)
      .entered(c)
    .endConcurrent()
  .end();
   
  ok(!matcher.get('match'), "should not match con(entered A, entered C)");
  
  matcher.begin()
    .beginConcurrent()
      .entered(a)
      .entered(b)
      .entered(c)
    .endConcurrent()
  .end();
   
  ok(!matcher.get('match'), "should not match con(entered A, entered B, entered C)");
   
});

test("match against sequence con(entered A entered B)", function() {
  monitor.pushEnteredState(a);
  monitor.pushEnteredState(b);
  monitor.pushEnteredState(x);
  monitor.pushEnteredState(m);
  monitor.pushEnteredState(n);
  monitor.pushEnteredState(y);
  monitor.pushEnteredState(o);
  monitor.pushEnteredState(p);
  monitor.pushEnteredState(c);
  
  var matcher = monitor.matchSequence();
  
  matcher.begin()
    .entered(a)
    .entered(b)
    .beginConcurrent()
      .beginSequence()
        .entered(x, m, n)
      .endSequence()
      .beginSequence()
        .entered(y, o, p)
      .endSequence()
    .endConcurrent()
    .entered(c)
  .end();
  
  ok(matcher.get('match'), 
    "should match entered A, entered B, con(seq(entered [X, M, N]), seq(entered [Y, O, P])) entered C)");
    
  matcher.begin()
    .entered(a)
    .entered(b)
    .beginConcurrent()
      .beginSequence()
        .entered(y, o, p)
      .endSequence()
      .beginSequence()
        .entered(x, m, n)
      .endSequence()
    .endConcurrent()
    .entered(c)
  .end();

  ok(matcher.get('match'), 
    "should match entered A, entered B, con(seq(entered [Y, O, P]), seq(entered [X, M, N])) entered C)");
    
  matcher.begin()
    .entered(a)
    .entered(b)
    .beginConcurrent()
      .beginSequence()
        .entered(x, m)
      .endSequence()
      .beginSequence()
        .entered(y, o, p)
      .endSequence()
    .endConcurrent()
    .entered(c)
  .end();

  ok(!matcher.get('match'), 
    "should not match entered A, entered B, con(seq(entered [X, M]), seq(entered [Y, O, P])) entered C)");
    
  matcher.begin()
    .entered(a)
    .entered(b)
    .beginConcurrent()
      .beginSequence()
        .entered(x, m, n)
      .endSequence()
      .beginSequence()
        .entered(y, o)
      .endSequence()
    .endConcurrent()
    .entered(c)
  .end();

  ok(!matcher.get('match'), 
    "should not match entered A, entered B, con(seq(entered [X, M]), seq(entered [Y, O])) entered C)");
    
  matcher.begin()
    .entered(a)
    .entered(b)
    .beginConcurrent()
      .beginSequence()
        .entered(x, m, n)
      .endSequence()
      .beginSequence()
        .entered(y, o, p)
      .endSequence()
      .entered(e)
    .endConcurrent()
    .entered(c)
  .end();

  ok(!matcher.get('match'), 
    "should not match entered A, entered B, con(seq(entered [X, M, N]), seq(entered [Y, O, P]), entered E) entered C)");
  
});