import { renderSettled, renderComponent } from '@ember/renderer';

import { expectTypeOf } from 'expect-type';

// ------- renderSettled -------
expectTypeOf(renderSettled()).toMatchTypeOf<Promise<void>>();
expectTypeOf<Parameters<typeof renderSettled>>().toMatchTypeOf<never[]>();

// ------- renderComponent -------
expectTypeOf<ReturnType<typeof renderComponent>>().toEqualTypeOf<{ destroy: () => void }>();
type Params = Parameters<typeof renderComponent>;
expectTypeOf<Params[0]>().toBeObject();
expectTypeOf<Params[1]>().toBeObject();
expectTypeOf<Params[1]['into']>().toBeObject();
expectTypeOf<Params[1]['owner']>().toEqualTypeOf<undefined | object>();
expectTypeOf<Params[1]['env']>().toMatchTypeOf<undefined | { isInteractive?: boolean | undefined }>();
expectTypeOf<Params[1]['args']>().toEqualTypeOf<undefined | Record<string, unknown>>();

// @ts-expect-error (args are required)
renderComponent()
// @ts-expect-error (wrong number of args)
renderComponent(1);
// @ts-expect-error (first arg not an object)
renderComponent(1, null);
// @ts-expect-error (second arg doesn't match the options)
renderComponent({}, null);
// @ts-expect-error (into is not an IntoTarget (Cursor | Element | SimpleElement))
renderComponent({}, { into: 1 });
