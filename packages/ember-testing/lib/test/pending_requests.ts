let requests: unknown[] = [];

export function pendingRequests() {
  return requests.length;
}

export function clearPendingRequests() {
  requests.length = 0;
}

export function incrementPendingRequests(_: unknown, xhr: unknown) {
  requests.push(xhr);
}

export function decrementPendingRequests(_: unknown, xhr: unknown) {
  setTimeout(function () {
    for (let i = 0; i < requests.length; i++) {
      if (xhr === requests[i]) {
        requests.splice(i, 1);
        break;
      }
    }
  }, 0);
}
