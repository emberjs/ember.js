const AFTER_OBSERVERS = ':change';

export default function changeEvent(keyName: string) {
  return keyName + AFTER_OBSERVERS;
}
