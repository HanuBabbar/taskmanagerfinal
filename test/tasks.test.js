
import request from 'supertest';
import { expect } from 'chai';
import app from '../app.js';

describe('Tasks API', () => {
    let token;
    let taskId;

    // Create a user and get token before tasks tests
    before(async () => {
        const testUser = {
            username: `taskuser_${Date.now()}`,
            email: `taskuser_${Date.now()}@test.com`,
            password: 'password123'
        };

        const res = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser);

        if (res.status !== 201) {
            console.error('Task Test Registration Failed:', res.status, res.body);
        }
        token = res.body.token;
    });

    it('should create a new task', async () => {
        const res = await request(app)
            .post('/api/v1/tasks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Integration Test Task',
                priority: 'High'
            });

        expect(res.status).to.equal(201);
        expect(res.body.newTask).to.have.property('name', 'Integration Test Task');
        expect(res.body.newTask).to.have.property('priority', 'High');
        taskId = res.body.newTask._id;
    });

    it('should get all tasks', async () => {
        const res = await request(app)
            .get('/api/v1/tasks')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).to.equal(200);
        expect(res.body.tasks).to.be.an('array');
        const found = res.body.tasks.find(t => t._id === taskId);
        expect(found).to.not.be.undefined;
    });

    it('should update a task', async () => {
        const res = await request(app)
            .patch(`/api/v1/tasks/${taskId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Updated Task Name',
                completed: true
            });

        expect(res.status).to.equal(200);
        expect(res.body.updatedTask).to.have.property('name', 'Updated Task Name');
        expect(res.body.updatedTask).to.have.property('completed', true);
    });

    it('should delete a task', async () => {
        const res = await request(app)
            .delete(`/api/v1/tasks/${taskId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).to.equal(200);
    });

    it('should fail to get deleted task', async () => {
        const res = await request(app)
            .get(`/api/v1/tasks/${taskId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).to.equal(404);
    });
});
