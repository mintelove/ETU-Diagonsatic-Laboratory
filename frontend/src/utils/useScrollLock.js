import { useEffect } from 'react';

/**
 * Custom React hook to lock body scrolling when a modal or preview overlay is open.
 * Ensures the background page remains at its exact current scroll position.
 */
export function useScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = originalOverflow || '';
      document.body.style.touchAction = originalTouchAction || '';
    };
  }, [isLocked]);
}

export default useScrollLock;
