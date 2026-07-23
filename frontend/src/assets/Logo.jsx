import logoImg from './logo.jpg';

export default function Logo({ size = 36, className = '', style = {} }) {
  return (
    <img
      src={logoImg}
      alt="ETU Diagnostic Laboratory Logo"
      width={size}
      height={size}
      className={`app-logo-img ${className}`}
      style={{
        objectFit: 'contain',
        maxWidth: '100%',
        height: 'auto',
        maxHeight: `${size}px`,
        ...style
      }}
    />
  );
}
