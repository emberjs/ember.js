export const LOCAL_DEBUG: true | false =
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import.meta.env.VM_LOCAL_DEV &&
  (() => {
    let location = typeof window !== 'undefined' && window.location;
    if (location && /[&?]disable_local_debug/u.test(window.location.search)) {
      return false;
    }
    return true;
  })();

export const LOCAL_SHOULD_LOG: true | false =
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import.meta.env.VM_LOCAL_DEV &&
  (() => {
    let location = typeof window !== 'undefined' && window.location;
    if (location && /[&?]enable_local_should_log/u.test(window.location.search)) {
      return true;
    }
    return false;
  })();
