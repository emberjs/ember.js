import RouteInfo, { RouteInfoWithAttributes } from '@ember/routing/route-info';
import RouterService from '@ember/routing/router-service';
import Transition from '@ember/routing/transition';
import { expectTypeOf } from 'expect-type';

declare let router: RouterService;

router.transitionTo('someRoute');
router.transitionTo('someRoute', { withModel: true });
router.transitionTo('someRoute', { withModel: true }, { queryParams: {} });
router.transitionTo(
  'someRoute',
  { withModel: true },
  { withMultipleModels: 'still checks correctly' },
  { queryParams: {} }
);

const routeWillChangeHandler = () => {};
expectTypeOf(router.on('routeWillChange', routeWillChangeHandler)).toEqualTypeOf<RouterService>();
expectTypeOf(router.has('routeWillChange')).toEqualTypeOf<boolean>();
expectTypeOf(router.off('routeWillChange', routeWillChangeHandler)).toEqualTypeOf<RouterService>();
expectTypeOf(router.one('routeWillChange', routeWillChangeHandler)).toEqualTypeOf<RouterService>();
expectTypeOf(router.trigger('routeWillChange', 'boo')).toEqualTypeOf<void>();

const transition = router.transitionTo('someRoute');

expectTypeOf(transition.abort()).toEqualTypeOf<Transition<unknown>>();

expectTypeOf(transition.catch()).toEqualTypeOf<Promise<unknown>>();
transition.catch((err) => console.log(err), 'label');

expectTypeOf(transition.finally()).toEqualTypeOf<Promise<unknown>>();
transition.finally(() => console.log('finally!'));
transition.finally(() => console.log('finally!'), 'label');

expectTypeOf(transition.followRedirects()).toEqualTypeOf<Promise<unknown>>();

expectTypeOf(transition.method()).toEqualTypeOf<Transition<unknown>>();
transition.method('replace');

expectTypeOf(transition.retry()).toEqualTypeOf<Transition<unknown>>();

expectTypeOf(transition.then()).toEqualTypeOf<Promise<unknown>>();
transition.then(
  (result) => console.log(result),
  (err) => console.log(err),
  'label'
);

expectTypeOf(transition.trigger(false, 'error')).toEqualTypeOf<void>();

expectTypeOf(transition.send(false, 'error')).toEqualTypeOf<void>();

transition.data = { some: 'data' };

expectTypeOf(transition.from).toEqualTypeOf<RouteInfoWithAttributes | null>();
// @ts-expect-error
transition.from = 'from';

expectTypeOf(transition.promise).toEqualTypeOf<Promise<unknown>>();
// @ts-expect-error
transition.promise = 'promise';

expectTypeOf(transition.to).toEqualTypeOf<RouteInfo | RouteInfoWithAttributes>();
// @ts-expect-error
transition.to = 'to';

expectTypeOf(transition.to.metadata).toEqualTypeOf<unknown>();
// @ts-expect-error
transition.to.metadata = 'foo';

// NOTE: we cannot check the validity of invocations with just route name and
// query params beyond that the second argument is an object of some sort,
// because TS will always resolve it to the `models` variant if the
// `queryParams` variant fails.
expectTypeOf(router.transitionTo('someRoute', { queryParams: { shouldWork: true } })).toEqualTypeOf<
  Transition<unknown>
>();
expectTypeOf(router.transitionTo({ queryParams: { areSupported: true } })).toEqualTypeOf<
  Transition<unknown>
>();
// @ts-expect-error
router.transitionTo({ queryParams: 'potato' });
expectTypeOf(router.transitionTo('someRoute', 1)).toEqualTypeOf<Transition<unknown>>();
expectTypeOf(
  router.transitionTo('someRoute', 1, { queryParams: { areSupported: true } })
).toEqualTypeOf<Transition<unknown>>();
expectTypeOf(router.transitionTo('someRoute', 1, '13')).toEqualTypeOf<Transition<unknown>>();
expectTypeOf(
  router.transitionTo('someRoute', 1, '13', { queryParams: { areSupported: true } })
).toEqualTypeOf<Transition<unknown>>();

expectTypeOf(router.recognize('foo/bar')).toEqualTypeOf<RouteInfo>();

expectTypeOf(router.recognizeAndLoad('foo/bar')).toEqualTypeOf<RouteInfoWithAttributes>();

expectTypeOf(router.rootURL).toEqualTypeOf<string>();
// @ts-expect-error
router.rootURL = 'foo';

expectTypeOf(router.refresh()).toEqualTypeOf<Transition<unknown>>();
expectTypeOf(router.refresh('my-route')).toEqualTypeOf<Transition<unknown>>();
