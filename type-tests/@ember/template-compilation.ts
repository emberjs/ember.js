import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

import { expectTypeOf } from 'expect-type';

// Valid usages
precompileTemplate(`Hello World`, { moduleName: 'foo' });
precompileTemplate(`Hello World`, { moduleName: 'foo', strictMode: false });
precompileTemplate(`Hello World`, { strictMode: false });
precompileTemplate(`Hello World`, { strictMode: true, scope: () => ({}) });
precompileTemplate(`Hello World`, { strictMode: true, scope: () => ({ setComponentTemplate }) });
precompileTemplate(`Hello World`, { strictMode: true, moduleName: 'hello', scope: () => ({}) });

// Integration, since this is the primary use case for precompileTemplate
expectTypeOf(setComponentTemplate(precompileTemplate(`Hello World`), templateOnly())).toBeObject();

// @ts-expect-error scope is required when strictMode is true
precompileTemplate(`Hello World`, { strictMode: true });

// @ts-expect-error scope must be a function
precompileTemplate(`Hello World`, { strictMode: true, scope: {} });

// @ts-expect-error scope must return an object
precompileTemplate(`Hello World`, { strictMode: true, scope: () => {} });

// @ts-expect-error scope must return an object and arrays are not the kind of object we want
precompileTemplate(`Hello World`, { strictMode: true, scope: () => [] });

// @ts-expect-error scope has no purpose when strictMode is false
precompileTemplate(`Hello World`, { strictMode: false, scope: () => ({}) });
