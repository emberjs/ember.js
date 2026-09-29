import { get } from '@ember/-internals/metal/lib/property_get';
import { hasUnknownProperty } from '@ember/-internals/metal/lib/property_get';

export default function isEmpty(obj: unknown): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }

  if (!hasUnknownProperty(obj) && typeof (obj as HasSize).size === 'number') {
    return !(obj as HasSize).size;
  }

  if (typeof obj === 'object') {
    let size = get(obj, 'size');
    if (typeof size === 'number') {
      return !size;
    }
    let length = get(obj, 'length');
    if (typeof length === 'number') {
      return !length;
    }
  }

  if (typeof (obj as HasLength).length === 'number' && typeof obj !== 'function') {
    return !(obj as HasLength).length;
  }

  return false;
}

interface HasSize {
  size: number;
}

interface HasLength {
  length: number;
}
