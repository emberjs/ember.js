let requests = [];
export function pendingRequests() {
  return requests.length;
}
export function clearPendingRequests() {
  requests.length = 0;
}
export function incrementPendingRequests(_, xhr) {
  requests.push(xhr);
}
export function decrementPendingRequests(_, xhr) {
  setTimeout(function () {
    for (let i = 0; i < requests.length; i++) {
      if (xhr === requests[i]) {
        requests.splice(i, 1);
        break;
      }
    }
  }, 0);
}