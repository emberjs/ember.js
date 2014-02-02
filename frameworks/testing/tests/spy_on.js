var object, methodSpy;
module('CoreTest.spyOn', {
  setup: function() {
    object = {method: function() {}};
    methodSpy = CoreTest.spyOn(object, 'method');
  }
});

test('when the spied upon method was called spy#wasCalled is true', function() {
  object.method();

  ok(methodSpy.wasCalled, 'spy should know that it was called');
});

test('when the spied upon method was not called spy#wasCalled is false', function() {
  ok(!methodSpy.wasCalled, 'spy should know that it was not called');
});

test('when the spied upon method is called with a single argument the spy should know when it was called with the proper arguments', function() {
  object.method('something');

  ok(methodSpy.wasCalledWith('something'), 'spy should know it was called with the proper arguments');
});

test('when the spied upon method is called with multiple arguments the spy should know when it was called with the proper arguments', function() {
  object.method('something', 'else');

  ok(methodSpy.wasCalledWith('something', 'else'), 'spy should know it was called with the proper arguments');
});

test('when the spied upon method is called with a single argument the spy should know when it was called with the wrong arguments', function() {
  object.method('something');

  ok(!methodSpy.wasCalledWith('else'), 'spy should know it was called with the wrong arguments');
});

test('when the spied upon method is called with multiple arguments the spy should know when it was called with the wrong arguments', function() {
  object.method('something', 'else');

  ok(!methodSpy.wasCalledWith('else', 'something'), 'spy should know it was called with the wrong arguments');
});
