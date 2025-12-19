
import { expect } from 'chai';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { auth } from '../../middlewares/auth.js';
import User from '../../DB/models/user.js';
import { custom_error } from '../../errors/custom-error.js';

describe('Unit Test: Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            header: sinon.stub(),
        };
        res = {};
        next = sinon.spy();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should throw 401 if Authorization header is missing', async () => {
        req.header.returns(null); // No header

        await auth(req, res, next);

        expect(next.calledOnce).to.be.true;
        const error = next.firstCall.args[0];
        expect(error).to.be.instanceOf(custom_error);
        expect(error.statusCode).to.equal(401);
        expect(error.message).to.include('No token');
    });

    it('should throw 401 if token is invalid', async () => {
        req.header.returns('Bearer invalidtoken');
        sinon.stub(jwt, 'verify').throws(new Error('Invalid token'));

        await auth(req, res, next);

        expect(next.calledOnce).to.be.true;
        const error = next.firstCall.args[0];
        expect(error).to.be.instanceOf(custom_error);
        expect(error.statusCode).to.equal(401);
    });

    it('should call next() and attach user if token is valid', async () => {
        const userId = 'user123';
        const userObj = { _id: userId, username: 'test' };

        req.header.returns('Bearer validtoken');
        sinon.stub(jwt, 'verify').returns({ id: userId });

        const findByIdStub = sinon.stub(User, 'findById');
        const selectStub = sinon.stub();
        findByIdStub.returns({ select: selectStub });
        selectStub.returns(userObj);

        await auth(req, res, next);

        expect(next.calledOnce).to.be.true;
        expect(next.firstCall.args[0]).to.be.undefined; // No error passed to next
        expect(req.user).to.deep.equal(userObj);
    });
});
