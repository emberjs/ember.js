# Ember.js JavaScript Style Guide

## Table Of Contents

+ [Objects](#objects)
+ [Array](#arrays)
+ [Strings](#strings)
+ [Variables](#variables)
+ [Whitespace](#whitespace)
+ [Commas](#commas)
+ [Semicolons](#semicolons)
+ [Block Statements](#block-statements)
+ [Conditional Statements](#conditional-statements)
+ [Properties](#properties)
+ [Functions](#functions)
+ [Arrow Functions](#arrow-functions)
+ [Function Arguments](#function-arguments)
+ [Rest Parameters](#rest-parameters)
+ [Destructuring](#destructuring)
+ [Comments](#comments)

## Objects

+ Use literal form for object creation.

```javascript
var foo = {};
```

+ Pad single-line objects with white-space.

```javascript
var bar = { color: 'orange' };
```

## Arrays

+ Use literal form for array creation (unless you know the exact length).

```javascript
var foo = [];
```

+ If you know the exact length and know that array is not going to grow, use `Array`.

```javascript
var foo = new Array(16);
```

+ Use `push` to add an item to an array.

```javascript
var foo = [];
foo.push('bar');
```

## Strings

+ Use `'single quotes'`.

## Variables

+ Put all non-assigning declarations on one line.

```javascript
var a, b;
```

+ Use a single `var` declaration for each assignment.

```javascript
var a = 1;
var b = 2;
```

+ Declare variables at the top of their scope.

```javascript
function foo() {
  var bar;

  console.log('foo bar!');

  bar = getBar();
}
```

## Whitespace

+ Use soft tabs set to 2 spaces.

```javascript
function() {
∙∙var name;
}
```

+ Place 1 space before the leading brace.

```javascript
obj.set('foo', {
  foo: 'bar'
});

test('foo-bar', function() {
});
```

+ No spaces before semicolons.

```javascript
var foo = {};
```

+ Keep parenthesis adjacent to the function name when declared or called.

```javascript
function foo() {
}

foo();
```

+ Spaces are required around binary operators.

```javascript
// assignments
var foo = bar + 'a';

// conditionals
if (foo === 'bara') {
}

// parameters
function(test, foo) {
}
```

## Commas

+ Skip trailing commas.

```javascript
var foo = [1, 2, 3];
var bar = { a: 'a' };
```

+ Skip leading commas.

```javascript
var foo = [
  1,
  2,
  3
];
```

## Semicolons

+ Use semicolons.

## Block Statements

+ Use spaces.

```javascript
// conditional
if (notFound) {
  return 0;
} else {
  return 1;
}

switch (condition) {
  case 'yes':
    // code
    break;
}

// loops
for (var key in keys) {
  // code
}

for (var i = 0, l = keys.length; i < l; i++) {
  // code
}

while (true) {
  // code
}

try {
  // code that throws an error
} catch(e) {
  // code that handles an error
}
```

+ Opening curly brace should be on the same line as the beginning of a statement or declaration.

```javascript
function foo() {
  var obj = {
    val: 'test'
  };

  return {
    data: obj
  };
}

if (foo === 1) {
  foo();
}

for (var key in keys) {
  bar(e);
}

while (true) {
  foo();
}
```

+ Keep `else` and its accompanying braces on the same line.

```javascript
if (foo === 1) {
  bar = 2;
} else {
  bar = '2';
}

if (foo === 1) {
  bar = 2;
} else if (foo === 2) {
  bar = 1;
} else {
  bar = 3;
}
```

## Conditional Statements

+ Use `===` and `!==`.
+ Use curly braces.

```javascript
if (notFound) {
  return;
}
```

+ Use explicit conditions.

```javascript
if (arr.length > 0) {
  // code
}

if (foo !== '') {
  // code
}
```

## Properties

+ Use dot-notation when accessing properties.

```javascript
var foo = {
  bar: 'bar'
};

foo.bar;
```

+ Use `[]` when accessing properties with a variable.

```javascript
var propertyName = 'bar';
var foo = {
  bar: 'bar'
};

foo[propertyName];
```

## Functions

+ Make sure to name functions when you define them.

```javascript
function fooBar() {
}
```
## Arrow Functions

+ Make sure arrow functions are done on multiple lines.

```javascript
var foo = [1,2,3,4].map((item) => {
  return item * 2;
});
```

## Function Arguments

`arguments` object must not be passed or leaked anywhere.
See the [reference](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments).

+ Use a `for` loop with `arguments` (instead of `slice`).

```javascript
function fooBar() {
  var args = new Array(arguments.length);

  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }

  return args;
}
```

+ Don't re-assign the arguments.

```javascript
function fooBar() {
  arguments = 3;
}

function fooBar(opt) {
  opt = 3;
}
```

+ Use a new variable if you need to re-assign an argument.

```javascript
function fooBar(opt) {
  var options = opt;

  options = 3;
}
```

## Rest Parameters

Since [Babel implements](https://babeljs.io/repl/#?experimental=true&playground=true&evaluate=true&loose=false&spec=false&code=function%20foo\(...args\)%20%7B%0A%20%20%0A%7D) Rest parameters in a non-leaking matter you should use them whenever applicable.

```javascript
function foo(...args) {
  args.forEach((item) => {
    console.log(item);
  });
}
```

## Destructuring

When decomposing simple arrays or objects, prefer [destructuring](http://babeljs.io/docs/learn-es6/#destructuring).

```javascript
// array destructuring
var fullName = 'component:foo-bar';
var [
  first,
  last
] = fullName.split(':');
```

```javascript
// object destructuring
var person = {
  firstName: 'Stefan',
  lastName: 'Penner'
};

var {
  firstName,
  lastName
} = person;
```

## Comments

+ Use [YUIDoc](http://yui.github.io/yuidoc/syntax/index.html) comments for
  documenting functions.
+ Use `//` for single line comments.

```javascript
function foo() {
  var bar = 5;

  // multiplies `bar` by 2.
  fooBar(bar);

  console.log(bar);
}
```
