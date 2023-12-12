import { moduleFor, RenderingTestCase, strip, classes, runTask } from 'internal-test-helpers';

import { set, computed } from '@ember/object';

import { Component } from '../../utils/helpers';

moduleFor(
  'ClassNameBindings integration',
  class extends RenderingTestCase {
    ['@test it can have class name bindings on the class definition']() {
      let FooBarComponent = Component.extend({
        classNameBindings: ['foo', 'isEnabled:enabled', 'isHappy:happy:sad'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar foo=this.foo isEnabled=this.isEnabled isHappy=this.isHappy}}', {
        foo: 'foo',
        isEnabled: true,
        isHappy: false,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled sad') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled sad') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'FOO');
        set(this.context, 'isEnabled', false);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view FOO sad') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', undefined);
        set(this.context, 'isHappy', true);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view happy') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'isEnabled', true);
        set(this.context, 'isHappy', false);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled sad') },
        content: 'hello',
      });
    }

    ['@test attrs in classNameBindings']() {
      let FooBarComponent = Component.extend({
        classNameBindings: ['attrs.joker:purple:green', 'attrs.batman.robin:black:red'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar joker=this.model.wat batman=this.model.super}}', {
        model: { wat: false, super: { robin: true } },
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view green black') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view green black') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'model.wat', true);
        set(this.context, 'model.super.robin', false);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view purple red') },
        content: 'hello',
      });

      runTask(() =>
        set(this.context, 'model', {
          wat: false,
          super: { robin: true },
        })
      );

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view green black') },
        content: 'hello',
      });
    }

    ['@test it can have class name bindings with nested paths']() {
      let FooBarComponent = Component.extend({
        classNameBindings: ['foo.bar', 'is.enabled:enabled', 'is.happy:happy:sad'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar foo=this.foo is=this.is}}', {
        foo: { bar: 'foo-bar' },
        is: { enabled: true, happy: false },
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo-bar enabled sad') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo-bar enabled sad') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo.bar', 'FOO-BAR');
        set(this.context, 'is.enabled', false);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view FOO-BAR sad') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo.bar', null);
        set(this.context, 'is.happy', true);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view happy') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', null);
        set(this.context, 'is', null);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view sad') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', { bar: 'foo-bar' });
        set(this.context, 'is', { enabled: true, happy: false });
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo-bar enabled sad') },
        content: 'hello',
      });
    }

    ['@test it should dasherize the path when the it resolves to true']() {
      let FooBarComponent = Component.extend({
        classNameBindings: ['fooBar', 'nested.fooBarBaz'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar fooBar=this.fooBar nested=this.nested}}', {
        fooBar: true,
        nested: { fooBarBaz: false },
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo-bar') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo-bar') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'fooBar', false);
        set(this.context, 'nested.fooBarBaz', true);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo-bar-baz') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'fooBar', 'FOO-BAR');
        set(this.context, 'nested.fooBarBaz', null);
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view FOO-BAR') },
        content: 'hello',
      });

      runTask(() => set(this.context, 'nested', null));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view FOO-BAR') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'fooBar', true);
        set(this.context, 'nested', { fooBarBaz: false });
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view foo-bar') },
        content: 'hello',
      });
    }

    ['@test :: class name syntax works with an empty true class']() {
      let FooBarComponent = Component.extend({
        classNameBindings: ['isEnabled::not-enabled'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar isEnabled=this.enabled}}', {
        enabled: false,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view not-enabled') },
        content: 'hello',
      });

      runTask(() => set(this.context, 'enabled', true));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view') },
        content: 'hello',
      });

      runTask(() => set(this.context, 'enabled', false));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view not-enabled') },
        content: 'hello',
      });
    }

    ['@test uses all provided static class names (issue #11193)']() {
      let FooBarComponent = Component.extend({
        classNameBindings: [':class-one', ':class-two'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render('{{foo-bar}}', {
        enabled: false,
      });

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view class-one class-two') },
        content: 'hello',
      });

      runTask(() => set(this.context, 'enabled', true));

      this.assertComponentElement(this.firstChild, {
        tagName: 'div',
        attrs: { class: classes('ember-view class-one class-two') },
        content: 'hello',
      });
    }

    ['@test Providing a binding with a space in it asserts']() {
      let FooBarComponent = Component.extend({
        classNameBindings: 'i:think:i am:so:clever',
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /classNameBindings must not have spaces in them/i);
    }

    ['@test it asserts that items must be strings']() {
      let FooBarComponent = Component.extend({
        foo: 'foo',
        bar: 'bar',
        classNameBindings: ['foo', , 'bar'], // eslint-disable-line no-sparse-arrays
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /classNameBindings must be non-empty strings/);
    }

    ['@test it asserts that items must be non-empty strings']() {
      let FooBarComponent = Component.extend({
        foo: 'foo',
        bar: 'bar',
        classNameBindings: ['foo', '', 'bar'],
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /classNameBindings must be non-empty strings/);
    }

    ['@test it can set class name bindings in the constructor']() {
      let FooBarComponent = Component.extend({
        classNameBindings: ['foo'],

        init() {
          this._super();

          let bindings = (this.classNameBindings = this.classNameBindings.slice());

          if (this.get('bindIsEnabled')) {
            bindings.push('isEnabled:enabled');
          }

          if (this.get('bindIsHappy')) {
            bindings.push('isHappy:happy:sad');
          }
        },
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      this.render(
        strip`
      {{foo-bar foo=this.foo bindIsEnabled=true isEnabled=this.isEnabled bindIsHappy=false isHappy=this.isHappy}}
      {{foo-bar foo=this.foo bindIsEnabled=false isEnabled=this.isEnabled bindIsHappy=true isHappy=this.isHappy}}
      {{foo-bar foo=this.foo bindIsEnabled=true isEnabled=this.isEnabled bindIsHappy=true isHappy=this.isHappy}}
      {{foo-bar foo=this.foo bindIsEnabled=false isEnabled=this.isEnabled bindIsHappy=false isHappy=this.isHappy}}
    `,
        { foo: 'foo', isEnabled: true, isHappy: false }
      );

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo sad') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled sad') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo') },
        content: 'hello',
      });

      runTask(() => this.rerender());

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo sad') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled sad') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'FOO');
        set(this.context, 'isEnabled', false);
      });

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view FOO') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view FOO sad') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view FOO sad') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: { class: classes('ember-view FOO') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', undefined);
        set(this.context, 'isHappy', true);
      });

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view happy') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view happy') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: { class: classes('ember-view') },
        content: 'hello',
      });

      runTask(() => {
        set(this.context, 'foo', 'foo');
        set(this.context, 'isEnabled', true);
        set(this.context, 'isHappy', false);
      });

      this.assertComponentElement(this.nthChild(0), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(1), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo sad') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(2), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo enabled sad') },
        content: 'hello',
      });
      this.assertComponentElement(this.nthChild(3), {
        tagName: 'div',
        attrs: { class: classes('ember-view foo') },
        content: 'hello',
      });
    }

    ['@test using a computed property for classNameBindings triggers an assertion']() {
      let FooBarComponent = Component.extend({
        classNameBindings: computed(function () {
          return ['isHappy:happy:sad'];
        }),
      });

      this.registerComponent('foo-bar', {
        ComponentClass: FooBarComponent,
        template: 'hello',
      });

      expectAssertion(() => {
        this.render('{{foo-bar}}');
      }, /Only arrays are allowed/);
    }
  }
);
