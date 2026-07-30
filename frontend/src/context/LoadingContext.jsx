import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToApiLoading } from '../api/client.js';

const LoadingContext = createContext({
  showLoading: () => {},
  hideLoading: () => {},
  showSuccess: () => {},
  isLoading: false,
});

export function LoadingProvider({ children }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success'
  const [message, setMessage] = useState('Processing...');
  const [subtitle, setSubtitle] = useState('Please wait while the system processes your request...');
  const dismissTimerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return subscribeToApiLoading((isApiLoading, activeCount, isError, isWriteOperation) => {
      clearTimer();
      if (isApiLoading) {
        setStatus('loading');
        setMessage('Processing...');
        setSubtitle('Please wait while the system processes your request...');
      } else {
        if (isError) {
          // On error, immediately dismiss overlay so existing toast handles it
          setStatus('idle');
        } else if (isWriteOperation) {
          // Option 1: On successful backend DB write, show green checkmark transition for 1.25s
          setStatus('success');
          setMessage('Completed Successfully');
          setSubtitle('Your request has been saved and processed successfully.');
          dismissTimerRef.current = setTimeout(() => {
            setStatus('idle');
          }, 1250);
        } else {
          // Option 2: Read-only / Frontend loading completes without showing Green Checkmark
          setStatus('idle');
        }
      }
    });
  }, [clearTimer]);

  const showLoading = useCallback((msg = 'Processing...', sub = 'Please wait while the system processes your request...') => {
    clearTimer();
    setMessage(msg);
    setSubtitle(sub);
    setStatus('loading');
  }, [clearTimer]);

  const showSuccess = useCallback((msg = 'Completed Successfully', sub = 'Your request has been processed successfully.') => {
    clearTimer();
    setMessage(msg);
    setSubtitle(sub);
    setStatus('success');
    dismissTimerRef.current = setTimeout(() => {
      setStatus('idle');
    }, 1250);
  }, [clearTimer]);

  const hideLoading = useCallback(() => {
    clearTimer();
    setStatus('idle');
  }, [clearTimer]);

  const isVisible = status !== 'idle';

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, showSuccess, isLoading: isVisible }}>
      {children}
      {isVisible && (
        <div
          className={`lims-global-loading-overlay ${status === 'success' ? 'lims-success-mode' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={status === 'success' ? 'Completed Successfully' : 'Processing'}
        >
          <div className="lims-loading-card">
            {status === 'loading' ? (
              <div className="lims-loading-spinner-wrap">
                <div className="lims-loading-spinner-ring" />
                <div className="lims-loading-spinner-ring-inner" />
                <div className="lims-loading-spinner-core">🧪</div>
              </div>
            ) : (
              <div className="lims-success-badge-wrap">
                <div className="lims-success-badge-circle">✓</div>
              </div>
            )}
            <h2 className="lims-loading-title" style={{ color: status === 'success' ? 'var(--color-success, #16a34a)' : 'inherit' }}>
              {message}
            </h2>
            <p className="lims-loading-subtitle">{subtitle}</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}
