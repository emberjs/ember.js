module('Ember.String.fmt');

test("'Hello %@ %@'.fmt('John', 'Doe') => 'Hello John Doe'", function() {
  equal(Ember.String.fmt('Hello %@ %@', ['John', 'Doe']), 'Hello John Doe');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('Hello %@ %@'.fmt('John', 'Doe'), 'Hello John Doe');
  }
});

test("'Hello %@2 %@1'.fmt('John', 'Doe') => 'Hello Doe John'", function() {
  equal(Ember.String.fmt('Hello %@2 %@1', ['John', 'Doe']), 'Hello Doe John');
  if (Ember.EXTEND_PROTOTYPES) {
    equal('Hello %@2 %@1'.fmt('John', 'Doe'), 'Hello Doe John');
  }
});

test("'%@08 %@07 %@06 %@05 %@04 %@03 %@02 %@01'.fmt('One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight') => 'Eight Seven Six Five Four Three Two One'", function() {
  equal(Ember.String.fmt('%@08 %@07 %@06 %@05 %@04 %@03 %@02 %@01', ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight']), 'Eight Seven Six Five Four Three Two One');

  if (Ember.EXTEND_PROTOTYPES) {
    equal('%@08 %@07 %@06 %@05 %@04 %@03 %@02 %@01'.fmt('One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'), 'Eight Seven Six Five Four Three Two One');
  }
});
