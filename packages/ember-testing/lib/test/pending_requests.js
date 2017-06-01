let pendingRequestsCounter = 0;

export function checkPendingRequests() {
  return pendingRequestsCounter > 0;
}

export function clearPendingRequests() {
  pendingRequestsCounter = 0;
}

export function incrementPendingRequests() {
  pendingRequestsCounter++;
}

export function decrementPendingRequests() {
  pendingRequestsCounter--;
}
