export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  const details = err.details || undefined;
  res.status(status).json({ success: false, message, details });
};
