import Joi from 'joi';

const defaultOptions = { abortEarly: false, stripUnknown: true };

export const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, defaultOptions);
  if (error) {
    return res.status(400).json({
      message: 'Validation failed',
      details: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  return next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, defaultOptions);
  if (error) {
    return res.status(400).json({
      message: 'Validation failed',
      details: error.details.map((d) => d.message),
    });
  }
  req.query = value;
  return next();
};
