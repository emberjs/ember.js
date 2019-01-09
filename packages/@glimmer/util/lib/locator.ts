import { TemplateMeta } from '@glimmer/interfaces';

export function templateMeta<T extends {}>(inner: T): TemplateMeta<T> {
  return inner as TemplateMeta<T>;
}
