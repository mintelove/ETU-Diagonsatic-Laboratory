const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// A stalled network request must never leave a Reception control permanently busy.
// Callers can still supply their own signal; it is combined with the request timeout.
export async function api(path, { token, signal, timeout = 15000, ...options } = {}) {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new DOMException('The request timed out.', 'TimeoutError'));
  }, timeout);
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal;

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
    if (!response.ok) throw new Error(data.message || 'Request failed.');
    return data;
  } catch (error) {
    if (error?.name === 'TimeoutError') throw new Error('The request took too long. Please try again.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
