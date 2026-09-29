import isEmpty from './is_empty';

export default function isBlank(obj: unknown): boolean {
  return isEmpty(obj) || (typeof obj === 'string' && /\S/.test(obj) === false);
}
