const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const requestListeners = new Set();
let activeMutationRequests = 0;

export function subscribeToApiLoading(listener) {
  requestListeners.add(listener);
  return () => requestListeners.delete(listener);
}

function notifyLoadingChange(isError = false) {
  requestListeners.forEach(fn => {
    try {
      fn(activeMutationRequests > 0, activeMutationRequests, isError);
    } catch (_) {}
  });
}

// A stalled network request must never leave a Reception control permanently busy.
// Callers can still supply their own signal; it is combined with the request timeout.
export async function api(path, { token, signal, timeout = 15000, showLoading, ...options } = {}) {
  const method = (options.method || 'GET').toUpperCase();
  // Mutating HTTP methods (POST, PUT, PATCH, DELETE) automatically trigger the global LIMS loading overlay.
  // Standard GET requests do NOT trigger the full-screen overlay unless explicitly requested via showLoading: true.
  const shouldTriggerLoading = showLoading !== undefined ? Boolean(showLoading) : method !== 'GET';

  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new DOMException('The request timed out.', 'TimeoutError'));
  }, timeout);
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

  if (shouldTriggerLoading) {
    activeMutationRequests++;
    notifyLoadingChange(false);
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
      throw new Error(data.message || 'Request failed.');
    }
    return data;
  } catch (error) {
    isCurrentError = true;
    if (error?.name === 'TimeoutError') throw new Error('The request took too long. Please try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    if (shouldTriggerLoading) {
      activeMutationRequests = Math.max(0, activeMutationRequests - 1);
      notifyLoadingChange(isCurrentError);
    }
  }
}
