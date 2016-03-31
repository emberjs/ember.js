import { RenderingTest, moduleFor } from '../utils/test-case';
import { set } from 'ember-metal/property_set';

const camelizeMap = {
  tabindex: 'tabIndex',
  maxlength: 'maxLength'
};

moduleFor('Input element tests', class extends RenderingTest {

  runAttributeTest(attributeName, values) {
    let template = `<input ${attributeName}={{value}}>`;
    this.render(template, { value: values[0] });
    this.assertAttributeHasValue(attributeName, values[0], `${attributeName} is set on initial render`);

    this.runTask(() => this.rerender());
    this.assertAttributeHasValue(attributeName, values[0], `${attributeName} is set on noop rerender`);

    this.setComponentValue(values[1]);
    this.assertAttributeHasValue(attributeName, values[1], `${attributeName} is set on rerender`);

    this.setComponentValue(values[0]);
    this.assertAttributeHasValue(attributeName, values[0], `${attributeName} can be set back to the initial value`);
  }

  ['@test input disabled attribute']() {
    this.runAttributeTest('disabled', [false, true]);
  }

  ['@test input value attribute']() {
    this.runAttributeTest('value', ['foo', 'bar']);
  }

  ['@test input placeholder attribute']() {
    this.runAttributeTest('placeholder', ['placeholder', 'facebolder']);
  }

  ['@test input name attribute']() {
    this.runAttributeTest('name', ['nam', 'name']);
  }

  ['@htmlbars input maxlength attribute']() {
    this.runAttributeTest('maxlength', [2, 3]);
  }

  ['@test input size attribute']() {
    this.runAttributeTest('size', [2, 3]);
  }

  ['@htmlbars input tabindex attribute']() {
    this.runAttributeTest('tabindex', [2, 3]);
  }

  ['@test cursor position is not lost when updating content']() {
    let template = `<input value={{value}}>`;
    this.render(template, { value: 'hola' });

    this.setDOMValue('hola');
    this.setSelectionRange(1, 3);

    this.setComponentValue('hola');
    this.assertSelectionRange(1, 3);
  }

  ['@test input can be updated multiple times']() {
    let template = `<input value={{value}}>`;
    this.render(template, { value: 'hola' });

    this.assertValue('hola', 'Value is initialised');

    this.setComponentValue('');
    this.assertValue('', 'Value is set in the DOM');

    this.setDOMValue('hola');
    this.setComponentValue('hola');
    this.assertValue('hola', 'Value is updated the first time');

    this.setComponentValue('');
    this.assertValue('', 'Value is updated the second time');
  }

  // private helpers and assertions
  setDOMValue(value) {
    this.inputElement().value = value;
  }

  setComponentValue(value) {
    this.runTask(() => set(this.context, 'value', value));
  }

  setSelectionRange(start, end) {
    this.inputElement().selectionStart = start;
    this.inputElement().selectionEnd = end;
  }

  inputElement() {
    return this.element.querySelector('input');
  }

  assertValue(value, message) {
    this.assertAttributeHasValue('value', value, message);
  }

  assertAttributeHasValue(attribute, value, message) {
    let camelized = camelizeMap[attribute] || attribute;
    this.assert.equal(this.inputElement()[camelized], value, `${attribute} ${message}`);
  }

  assertSelectionRange(start, end) {
    this.assert.equal(this.inputElement().selectionStart, start);
    this.assert.equal(this.inputElement().selectionEnd, end);
  }

});
