import isBlank from './is_blank';

export default function isPresent<T>(obj: T | null | undefined): obj is T {
  return !isBlank(obj);
}
