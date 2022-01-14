import { expandProperties } from '@ember/object/computed';

// eslint-disable-next-line no-console
expandProperties('{foo}.bar.{baz}', (arg: string) => console.log(arg));

// @ts-expect-error a callback is required
expandProperties('{foo}.bar.{baz}');

// @ts-expect-error a pattern is required
expandProperties();

// @ts-expect-error a valid callback is required
expandProperties('{foo}.bar.{baz}', (arg: number) => arg);
