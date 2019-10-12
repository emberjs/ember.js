import { Tag, UpdatableTag } from '@glimmer/reference';

export interface StartOptions {
  watch?: boolean;
  forObject?: object;
  history?: boolean;
  verbose?: boolean;
}
export interface DebugTracking {
  history: { [revision: number]: TrackerSnapshot[] };
  objectMap: WeakMap<object, number>;
  isRecording: boolean;
  isWatching: boolean;
  isTrackingHistory: boolean;
  verbose: boolean;
  objectOfRelevance?: object;
  print: (options?: { verbose?: boolean; showInitial?: boolean }) => void;
  start: (options: StartOptions) => void;
  stop: () => void;
}

export interface TrackerSnapshot {
  tag: TagSnapshot;
  dependencies: TagSnapshot[];
  all: TagSnapshot[];
}

export interface TagSnapshot {
  propertyName: string;
  objectName: string;
  objectRef: object;
  objectId: number;
  revision: number;
  tag: Tag | UpdatableTag;
  dependencies: TagSnapshot[];
}
