import { read } from '../streams/utils';
import { MUTABLE_REFERENCE } from 'ember-htmlbars/keywords/mut';

export default function getCellOrValue(ref) {
  if (ref && ref[MUTABLE_REFERENCE]) {
    // Reify the mutable reference into a mutable cell.
    return ref.cell();
  }

  // Get the value out of the reference.
  return read(ref);
}
