import { expectTypeOf } from 'expect-type';

/**
 * We no longer use RSVP internally, 
 * but to ensure we don't accidentally break compatibility
 * with users who are still using it, I wanted verification
 * that apis RSVP promises satisfy native promise types.
 */
import RSVP from 'rsvp';

const nativePromise = new Promise((resolve) => resolve(0));

expectTypeOf(nativePromise).not.toMatchTypeOf<RSVP.Promise<any>>();
expectTypeOf(nativePromise).toMatchTypeOf<Promise<any>>();

const rsvpPromise = new RSVP.Promise((resolve) => resolve(0));

expectTypeOf(rsvpPromise).toMatchTypeOf<RSVP.Promise<any>>();
expectTypeOf(rsvpPromise).toMatchTypeOf<Promise<any>>();

function takesNativePromise(p: Promise<any>) {}

function takesRSVPPromise(p: RSVP.Promise<any>) {}

takesNativePromise(nativePromise);
takesNativePromise(rsvpPromise);

takesRSVPPromise(rsvpPromise); 
// @ts-expect-error RSVP.Promise is not a native Promise
takesRSVPPromise(nativePromise);