
import request from 'supertest';
import { expect } from 'chai';
import app from '../app.js';

describe('Auth API', () => {
    let userToken;
    const testUser = {
        username: `testuser_${Date.now()}`,
        email: `testuser_${Date.now()}@example.com`,
        password: 'password123'
    };

    // Clean up or setup before tests if possible (removed for basic level, assuming unique email or handling conflict)
    // Actually, if we run this multiple times, register will fail. 
    // We should probably try to login first, if fail then register.
    // Or just use a random email.

    const randomEmail = `test${Date.now()}@example.com`;
    testUser.email = randomEmail;

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser);

        expect(res.status).to.equal(201);
        expect(res.body).to.have.property('token');
        expect(res.body.user).to.have.property('email', testUser.email);
        userToken = res.body.token;
    });

    it('should login an existing user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('token');
        userToken = res.body.token; // Update token just in case
    });

    it('should return current user profile', async () => {
        const res = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).to.equal(200);
        expect(res.body.user).to.have.property('email', testUser.email);
    });

    it('should fail to login with wrong password', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            });

        expect(res.status).to.equal(401);
    });
});
