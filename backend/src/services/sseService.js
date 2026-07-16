/**
 * ETU Diagnostic Laboratory — Server-Sent Events (SSE) Service
 *
 * Manages all active SSE client connections and broadcasts named events
 * to every connected client whenever data changes on the backend.
 *
 * Usage in controllers:
 *   import { emit } from '../services/sseService.js';
 *   emit('stock:change', { action: 'created' });
 */

/** @type {Set<import('express').Response>} */
const clients = new Set();

/**
 * Register a new SSE client response object.
 * @param {import('express').Response} res
 */
export function addClient(res) {
  clients.add(res);
}

/**
 * Remove a disconnected SSE client.
 * @param {import('express').Response} res
 */
export function removeClient(res) {
  clients.delete(res);
}

/**
 * Broadcast a named event with optional JSON data to all connected clients.
 * @param {string} event - The event name (e.g. 'stock:change')
 * @param {object} [data={}] - Optional payload serialized as JSON
 */
export function emit(event, data = {}) {
  if (clients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      // Client disconnected mid-write — remove it
      clients.delete(res);
    }
  }
}

/**
 * Returns how many clients are currently connected.
 * @returns {number}
 */
export function clientCount() {
  return clients.size;
}
