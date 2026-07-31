const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const requestListeners = new Set();
let activeLoadingRequests = 0;

export function subscribeToApiLoading(listener) {
  requestListeners.add(listener);
  return () => requestListeners.delete(listener);
}

function notifyLoadingChange(isError = false, isWriteOperation = false) {
  requestListeners.forEach(fn => {
    try {
      fn(activeLoadingRequests > 0, activeLoadingRequests, isError, isWriteOperation);
    } catch (_) {}
  });
}

// A stalled network request must never leave a control permanently busy.
// Mutating HTTP methods (POST, PUT, PATCH, DELETE) write to backend DB and trigger Option 1 (Processing -> Green Success Check).
// Read operations (GET) or transient frontend calls trigger Option 2 (Processing -> Hide, NO Green Success Check).
export async function api(path, { token, signal, timeout = 15000, showLoading, isWrite, ...options } = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isWriteOperation = isWrite !== undefined ? Boolean(isWrite) : (method !== 'GET');
  const shouldTriggerLoading = showLoading !== undefined ? Boolean(showLoading) : isWriteOperation;

  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new DOMException('The request timed out.', 'TimeoutError'));
  }, timeout);
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  if (shouldTriggerLoading) {
    activeLoadingRequests++;
    notifyLoadingChange(false, isWriteOperation);
  }

  let isCurrentError = false;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: requestSignal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      isCurrentError = true;
      const serverMsg = data.message || data.error || (data.errors && data.errors.map(e => e.msg || e.message).join(', ')) || `HTTP ${response.status}: ${response.statusText}`;
      const err = new Error(serverMsg);
      err.status = response.status;
      err.data = data;
      err.isNetworkError = false;
      throw err;
    }
    return data;
  } catch (error) {
    isCurrentError = true;
    if (error?.name === 'TimeoutError') {
      const err = new Error('The request took too long. Please try again.');
      err.isTimeout = true;
      err.isNetworkError = false;
      throw err;
    }
    if (error?.status !== undefined) {
      error.isNetworkError = false;
      throw error;
    }
    error.isNetworkError = true;
    throw error;
  } finally {
    clearTimeout(timer);
    if (shouldTriggerLoading) {
      activeLoadingRequests = Math.max(0, activeLoadingRequests - 1);
      notifyLoadingChange(isCurrentError, isWriteOperation);
    }
  }
}

