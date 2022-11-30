import { Person } from './create';

// @ts-expect-error
Person.create({ firstName: 99 });
// @ts-expect-error
Person.create({}, { firstName: 99 });
// @ts-expect-error
Person.create({}, {}, { firstName: 99 });
