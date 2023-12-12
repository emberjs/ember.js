import Namespace from '@ember/application/namespace';

import { expectTypeOf } from 'expect-type';

// @ts-expect-error: VERSION is a static property.
const namespace = Namespace.create({ VERSION: '1.0.0' });

expectTypeOf(namespace).toMatchTypeOf<Namespace>();
