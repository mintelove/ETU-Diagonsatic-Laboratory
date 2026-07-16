export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

export function errorHandler(error, req, res, next) {
  // Log the complete stack trace
  console.error('ERROR STACK TRACE:\n', error.stack || error);

  const status = error.statusCode || (error.code === 11000 ? 409 : error.name === 'CastError' ? 400 : 500);
  const message = error.code === 11000 
    ? 'A record with that value already exists.' 
    : error.name === 'CastError' 
      ? 'Invalid record identifier.' 
      : error.message || 'An unexpected error occurred.';

  res.status(status).json({ message });
}
