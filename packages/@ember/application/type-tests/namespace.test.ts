import Namespace from '@ember/application/namespace';

import { expectTypeOf } from 'expect-type';

const namespace = Namespace.create({ VERSION: '1.0.0' });

expectTypeOf(namespace).toMatchTypeOf<Namespace>();
