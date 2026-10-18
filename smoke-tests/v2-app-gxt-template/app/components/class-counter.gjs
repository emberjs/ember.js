import Component from '@glimmer/component';

// A component CLASS whose template is a class-body `<template>`, resolved by
// name from the runtime-compiled route template: its component manager
// creates it with the invocation's arguments, and the template renders with
// it as `this`.
export default class ClassCounter extends Component {
  label = 'Class count';

  increment = () => {
    this.args.increment();
  };

  <template>
    <p data-test-class-counter>{{this.label}}: {{@count}}</p>
    <button type="button" data-test-class-increment {{on "click" this.increment}}>+1 (class)</button>
  </template>
}
