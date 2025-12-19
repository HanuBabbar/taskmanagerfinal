
import { expect } from 'chai';
import { createCustomError, custom_error } from '../../errors/custom-error.js';

describe('Unit Test: Custom Error', () => {
    it('should create an instance of custom_error', () => {
        const error = createCustomError('Something went wrong', 404);
        expect(error).to.be.instanceOf(custom_error);
    });

    it('should have the correct message and status code', () => {
        const msg = 'Unauthorized';
        const code = 401;
        const error = createCustomError(msg, code);
        expect(error.message).to.equal(msg);
        expect(error.statusCode).to.equal(code);
    });
});
