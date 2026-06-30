function appError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function validationError(message) {
  return appError('VALIDATION_ERROR', message);
}

module.exports = { appError, validationError };
