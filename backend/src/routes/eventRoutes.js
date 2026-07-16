/**
 * ETU Diagnostic Laboratory — SSE Events Route
 *
 * GET /api/events
 * Authenticated clients connect here via the browser's native EventSource API.
 * The connection stays open; the server pushes named events whenever data changes.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { addClient, removeClient } from '../services/sseService.js';

const router = Router();

// Heartbeat interval — keeps the connection alive through proxies / load balancers
const HEARTBEAT_MS = 25_000;

router.get('/', authenticate, (req, res) => {
  // Set SSE-required headers
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering when behind a proxy
  });
  res.flushHeaders();

  // Send an initial "connected" event so the client knows the stream is live
  res.write('event: connected\ndata: {"status":"ok"}\n\n');

  // Register the client
  addClient(res);

  // Send periodic heartbeat comments to keep the connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_MS);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

export default router;
