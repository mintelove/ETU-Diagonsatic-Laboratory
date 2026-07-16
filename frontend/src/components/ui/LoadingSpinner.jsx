/**
 * ETU Diagnostic Laboratory — Loading Spinner Component
 *
 * Reusable spinner with size and color variants.
 * Uses CSS classes from styles/components.css.
 */

export default function LoadingSpinner({
  size = 'md',     // 'sm' | 'md' | 'lg' | 'xl'
  variant = 'default', // 'default' | 'primary'
  className = '',
  label = 'Loading…',
}) {
  const sizeClass = size !== 'md' ? ` loading-spinner--${size}` : '';
  const variantClass = variant === 'primary' ? ' loading-spinner--primary' : '';

  return (
    <span
      className={`loading-spinner${sizeClass}${variantClass} ${className}`.trim()}
      role="status"
      aria-label={label}
    >
      <span className="loading-spinner__ring" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
