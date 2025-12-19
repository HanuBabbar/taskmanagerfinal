import { custom_error } from "../errors/custom-error.js";

const errorHandler = (error, req, res, next) => {
    if (error instanceof custom_error) {
        return res.status(error.statusCode).json({ message: error.message });
    }

    // For non-custom errors, return a readable message. Include stack only in development.
    const message = error && (error.message || String(error)) ? (error.message || String(error)) : 'Internal Server Error';
    const payload = { message };
    if (process.env.NODE_ENV !== 'production' && error && error.stack) payload.stack = error.stack;

    return res.status(500).json(payload);
}

export default errorHandler;