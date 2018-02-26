import { RenderingTest, moduleFor } from '../utils/test-case';
import { set } from 'ember-metal';

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

  runPropertyTest(propertyName, values) {
    let attributeName = propertyName;
    let template = `<input ${attributeName}={{value}}>`;
    this.render(template, { value: values[0] });
    this.assertPropertyHasValue(propertyName, values[0], `${propertyName} is set on initial render`);

    this.runTask(() => this.rerender());
    this.assertPropertyHasValue(propertyName, values[0], `${propertyName} is set on noop rerender`);

    this.setComponentValue(values[1]);
    this.assertPropertyHasValue(propertyName, values[1], `${propertyName} is set on rerender`);

    this.setComponentValue(values[0]);
    this.assertPropertyHasValue(propertyName, values[0], `${propertyName} can be set back to the initial value`);
  }

  runFalsyValueProperty(values) {
    let value = 'value';
    let template = `<input value={{value}}>`;
    this.render(template, { value: values[0] });
    this.assertPropertyHasValue(value, '', `${value} is set on initial render`);

    this.runTask(() => this.rerender());
    this.assertPropertyHasValue(value, '', `${value} is set on noop rerender`);
    this.setComponentValue(values[1]);

    this.assertPropertyHasValue(value, values[1], `${value} is set on rerender`);

    this.setComponentValue(values[0]);
    this.assertPropertyHasValue(value, '', `${value} can be set back to the initial value`);
  }

  ['@test input disabled attribute']() {
    let model = { model:  { value: false } };

    this.render(`<input disabled={{model.value}}>`, model);

    this.assert.equal(this.$inputElement().prop('disabled'), false);

    this.runTask(() => this.rerender());

    this.assert.equal(this.$inputElement().prop('disabled'), false);

    this.runTask(() => this.context.set('model.value', true));

    this.assert.equal(this.$inputElement().prop('disabled'), true);
    this.assertHTML('<input disabled="">'); // Note the DOM output is <input disabled>

    this.runTask(() => this.context.set('model.value', 'wat'));

    this.assert.equal(this.$inputElement().prop('disabled'), true);
    this.assertHTML('<input disabled="">'); // Note the DOM output is <input disabled>

    this.runTask(() => this.context.set('model', { value: false }));

    this.assert.equal(this.$inputElement().prop('disabled'), false);
    this.assertHTML('<input>');
  }

  ['@test input value attribute']() {
    this.runPropertyTest('value', ['foo', 'bar']);
  }

  ['@test input placeholder attribute']() {
    this.runAttributeTest('placeholder', ['foo', 'bar']);
  }

  ['@test input name attribute']() {
    this.runAttributeTest('name', ['nam', 'name']);
  }

  ['@test input maxlength attribute']() {
    this.runAttributeTest('maxlength', [2, 3]);
  }

  ['@test input size attribute']() {
    this.runAttributeTest('size', [2, 3]);
  }

  ['@test input tabindex attribute']() {
    this.runAttributeTest('tabindex', [2, 3]);
  }

  ['@test null input value']() {
    this.runFalsyValueProperty([null, 'hello']);
  }

  ['@test undefined input value']() {
    this.runFalsyValueProperty([undefined, 'hello']);
  }

  ['@test undefined `toString` method as input value']() {
    this.runFalsyValueProperty([Object.create(null), 'hello']);
  }

  ['@test cursor position is not lost when updating content']() {
    let template = `<input value={{value}}>`;
    this.render(template, { value: 'hola' });

    this.setDOMValue('hello');
    this.setSelectionRange(1, 3);

    this.setComponentValue('hello');

    this.assertSelectionRange(1, 3);

    // Note: We should eventually get around to testing reseting, however
    // browsers handle `selectionStart` and `selectionEnd` differently
    // when are synthetically testing movement of the cursor.
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

  ['@test DOM is SSOT if value is set']() {
    let template = `<input value={{value}}>`;
    this.render(template, { value: 'hola' });

    this.assertValue('hola', 'Value is initialised');

    this.setComponentValue('hello');

    this.assertValue('hello', 'Value is initialised');

    this.setDOMValue('hola');

    this.assertValue('hola', 'DOM is used');

    this.setComponentValue('bye');

    this.assertValue('bye', 'Value is used');

    // Simulates setting the input to the same value as it already is which won't cause a rerender

    this.setDOMValue('hola');

    this.assertValue('hola', 'DOM is used');

    this.setComponentValue('hola');

    this.assertValue('hola', 'Value is used');
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
    return this.$inputElement()[0];
  }

  $inputElement() {
    return this.$('input');
  }

  assertValue(value, message) {
    this.assertPropertyHasValue('value', value, message);
  }

  assertAttributeHasValue(attribute, value, message) {
    this.assert.equal(this.$inputElement().attr(attribute), value, `${attribute} ${message}`);
  }

  assertPropertyHasValue(property, value, message) {
    this.assert.equal(this.$inputElement().prop(property), value, `${property} ${message}`);
  }

  assertSelectionRange(start, end) {
    this.assert.equal(this.inputElement().selectionStart, start);
    this.assert.equal(this.inputElement().selectionEnd, end);
  }

});
