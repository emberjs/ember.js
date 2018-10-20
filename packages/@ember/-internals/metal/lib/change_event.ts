const AFTER_OBSERVERS = ':change';

export default function changeEvent(keyName: string): string {
  return keyName + AFTER_OBSERVERS;
}
