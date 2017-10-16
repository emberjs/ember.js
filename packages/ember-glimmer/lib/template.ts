import { OWNER } from 'ember-utils';
import { templateFactory } from '@glimmer/runtime';

export default function template(json) {
  const factory = templateFactory(json);

  return {
    id: factory.id,
    meta: factory.meta,
    create(props) {
      return factory.create(props.env, { owner: props[OWNER] });
    }
  };
}
