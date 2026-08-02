import React from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../utils/useScrollLock.js';

/**
 * Universal Modal Portal component.
 * Renders modal overlays directly into document.body to bypass parent CSS transform
 * containment blocks, guaranteeing position:fixed stays 100% relative to the screen viewport.
 */
export function ModalPortal({ isOpen, onClose, children, className = '', style = {} }) {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`global-modal-portal-backdrop ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 25, 40, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '20px',
        boxSizing: 'border-box',
        margin: 0,
        overflow: 'hidden',
        ...style
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export default ModalPortal;
