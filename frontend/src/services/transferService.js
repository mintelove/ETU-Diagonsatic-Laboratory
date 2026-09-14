import { api } from '../api/client.js';

export async function createTransfer(data, token) {
  return api('/transfers', {
    token,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function getTransfers(params = {}, token) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return api(`/transfers${query ? `?${query}` : ''}`, { token });
}

export async function receiveTransfer(transferId, token) {
  return api(`/transfers/${transferId}/receive`, {
    token,
    method: 'POST'
  });
}

export async function startInvestigation(transferId, token) {
  return api(`/transfers/${transferId}/investigate`, {
    token,
    method: 'POST'
  });
}

export async function cancelTransfer(transferId, reason = '', token) {
  return api(`/transfers/${transferId}/cancel`, {
    token,
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function getTransferAudit(transferId, token) {
  return api(`/transfers/${transferId}/audit`, { token });
}

export async function sendResultDirect(transferId, data = {}, token) {
  return api(`/transfers/${transferId}/send-result`, {
    token,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function sendResultBack(transferId, data = {}, token) {
  return api(`/transfers/${transferId}/send-back`, {
    token,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function clearTransfer(transferId, reason = '', token) {
  return api(`/transfers/${transferId}/clear`, {
    token,
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function restoreTransfer(transferId, token) {
  return api(`/transfers/${transferId}/restore`, {
    token,
    method: 'POST'
  });
}

export async function getClearedTransfers(token) {
  return api('/transfers/cleared', { token });
}

