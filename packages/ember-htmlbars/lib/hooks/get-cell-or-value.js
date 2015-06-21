import { read } from 'ember-metal/streams/utils';
import { MUTABLE_REFERENCE } from 'ember-htmlbars/keywords/mut';

export default function getCellOrValue(ref) {
  if (ref && ref[MUTABLE_REFERENCE]) {
    // reify the mutable reference into a mutable cell
    return ref.cell();
  }

  // get the value out of the reference
  return read(ref);
}
