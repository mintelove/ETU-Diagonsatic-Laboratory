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

/**
 * Checks if an error is a network connection failure, timeout, or abort.
 * Use to ensure network exceptions are handled silently in the background without UI errors.
 */
export function isSilentNetworkError(err) {
  if (!err) return false;
  if (err.isNetworkError || err.isTimeout) return true;
  const msg = String(err.message || '').toLowerCase();
  const name = String(err.name || '').toLowerCase();
  return (
    name === 'aborterror' ||
    name === 'timeouterror' ||
    (name === 'typeerror' && (msg.includes('fetch') || msg.includes('network'))) ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('networkrequest') ||
    msg.includes('connection failed') ||
    msg.includes('unable to connect') ||
    msg.includes('econnrefused') ||
    msg.includes('err_network') ||
    msg.includes('server unavailable') ||
    msg.includes('load failed') ||
    msg.includes('timeout')
  );
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
      let serverMsg = data?.message || data?.error || (data?.errors && data.errors.map(e => e.msg || e.message).join(', '));
      if (!serverMsg) {
        if (response.status === 401) serverMsg = 'Authentication required. Session may be expired.';
        else if (response.status === 403) serverMsg = 'You do not have permission to perform this action.';
        else if (response.status === 404) serverMsg = 'Requested API endpoint not found.';
        else if (response.status >= 500) serverMsg = 'A temporary server error occurred. Please try again.';
        else serverMsg = `Request failed with status ${response.status}.`;
      }
      const err = new Error(serverMsg);
      err.status = response.status;
      err.data = data;
      err.isNetworkError = false;
      throw err;
    }
    return data;
  } catch (error) {
    isCurrentError = true;
    if (error?.name === 'TimeoutError' || error?.isTimeout) {
      const err = new Error('Request timed out');
      err.isTimeout = true;
      err.isNetworkError = true;
      err.originalError = error;
      throw err;
    }
    if (error?.status !== undefined) {
      error.isNetworkError = false;
      throw error;
    }
    const netErr = new Error('Network request failed');
    netErr.isNetworkError = true;
    netErr.originalError = error;
    throw netErr;
  } finally {
    clearTimeout(timer);
    if (shouldTriggerLoading) {
      activeLoadingRequests = Math.max(0, activeLoadingRequests - 1);
      notifyLoadingChange(isCurrentError, isWriteOperation);
    }
  }
}
