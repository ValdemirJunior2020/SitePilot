export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  const status = Number(error.status || error.statusCode) || 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Server error. Please try again.'
    : (error.message || 'Unexpected server error.');

  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(status).json({ success: false, error: message });
}
