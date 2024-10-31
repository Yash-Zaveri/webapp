// responseUtil.js

/**
 * Sets a successful response with a given object and status code.
 * @param {Object} obj - The object to send in the response.
 * @param {Object} response - The response object from the Express framework.
 * @param {number} status - The HTTP status code to set.
 */
const setSuccessResponse = (obj, response, status) => {
    response.status(status);
    response.json(obj);
};

/**
 * Sets an error response with a given error message and status code.
 * @param {Object} error - The error object or message to send in the response.
 * @param {Object} response - The response object from the Express framework.
 * @param {number} status - The HTTP status code to set.
 */
const setErrorResponse = (error, response, status) => {
    response.status(status);
    response.json(error);
};

export { setSuccessResponse, setErrorResponse };
