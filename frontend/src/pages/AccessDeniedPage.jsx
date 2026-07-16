/**
 * ETU Diagnostic Laboratory — Access Denied Page
 *
 * Rendered when an authenticated user attempts to access a route
 * they do not have the required role permissions for.
 */

import { Link } from 'react-router-dom';

export default function AccessDeniedPage() {
  return (
    <section className="page access-denied">
      <p className="eyebrow">Restricted area</p>
      <h1>Access denied</h1>
      <p className="intro">
        Your account does not have permission to open this dashboard.
      </p>
      <Link className="primary" to="/">
        Return to your workspace
      </Link>
    </section>
  );
}
