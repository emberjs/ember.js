import Ember from 'ember';
import { SafeString } from '@ember/template/-private/handlebars';
import { expectTypeOf } from 'expect-type';

const { dasherize, camelize, capitalize, classify, decamelize, htmlSafe, underscore, w } =
  Ember.String;

// @ts-expect-error
dasherize();
expectTypeOf(dasherize('blue man group')).toEqualTypeOf<string>();
// @ts-expect-error
dasherize('', '');

// @ts-expect-error
camelize();
expectTypeOf(camelize('blue man group')).toEqualTypeOf<string>();
// @ts-expect-error
camelize('', '');

// @ts-expect-error
decamelize();
expectTypeOf(decamelize('blue man group')).toEqualTypeOf<string>();
// @ts-expect-error
decamelize('', '');

// @ts-expect-error
underscore();
expectTypeOf(underscore('blue man group')).toEqualTypeOf<string>();
// @ts-expect-error
underscore('', '');

// @ts-expect-error
w();
expectTypeOf(w('blue man group')).toEqualTypeOf<string[]>();
// @ts-expect-error
w('', '');

// @ts-expect-error
classify();
expectTypeOf(classify('blue man group')).toEqualTypeOf<string>();
// @ts-expect-error
classify('', '');

// @ts-expect-error
capitalize();
expectTypeOf(capitalize('blue man group')).toEqualTypeOf<string>();
// @ts-expect-error
capitalize('', '');

const handlebarsSafeString = htmlSafe('lorem ipsum...');
expectTypeOf(handlebarsSafeString).toEqualTypeOf<SafeString>();
expectTypeOf(handlebarsSafeString).not.toEqualTypeOf<string>();
