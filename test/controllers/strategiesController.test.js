const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = require('chai');
const { setupTestDatabase, clearTestDatabase, destroyTestDatabase, createTestData } = require('../helpers/testHelper');
const app = require('../../app');

chai.use(chaiHttp);

describe('Strategies Controller', () => {
    before(async () => {
        try {
            // First setup the database
            await setupTestDatabase();
            // Then clear any existing data
            await clearTestDatabase();
            // Finally create test data
            await createTestData();
        } catch (error) {
            console.error('Error in before hook:', error);
            throw error;
        }
    });

    after(async () => {
        try {
            await clearTestDatabase();
        } catch (error) {
            console.error('Error in after hook:', error);
            throw error;
        }
    });

    after(async () => {
        try {
            await destroyTestDatabase();
        } catch (error) {
            console.error('Error in final after hook:', error);
            throw error;
        }
    });

    describe('GET /api/strategies', () => {
        it('should get all strategies', async () => {
            const res = await chai.request(app)
                .get('/api/strategies')
                .set('Content-Type', 'application/json');

            expect(res).to.have.status(200);
            expect(res.body).to.be.an('array');
            expect(res.body[0]).to.have.property('name');
            expect(res.body[0]).to.have.property('description');
        });
    });

    describe('POST /api/strategies', () => {
        it('should create a new strategy', async () => {
            const newStrategy = {
                name: 'Test Strategy 2',
                description: 'This is another test strategy',
                status: 'OPEN',
                symbol: 'TEST2'
            };

            const res = await chai.request(app)
                .post('/api/strategies')
                .set('Content-Type', 'application/json')
                .send(newStrategy);

            expect(res).to.have.status(201);
            expect(res.body).to.have.property('id');
            expect(res.body.name).to.equal(newStrategy.name);
            expect(res.body.description).to.equal(newStrategy.description);
        });

        it('should return 400 if required fields are missing', async () => {
            const invalidStrategy = {
                description: 'This is missing required fields'
            };

            const res = await chai.request(app)
                .post('/api/strategies')
                .set('Content-Type', 'application/json')
                .send(invalidStrategy);

            expect(res).to.have.status(400);
        });
    });

    describe('GET /api/strategies/:id', () => {
        it('should get a strategy by id', async () => {
            // First create a strategy to get
            const newStrategy = {
                name: 'Strategy to Get',
                description: 'This strategy will be retrieved',
                status: 'OPEN',
                symbol: 'TEST3'
            };

            const createRes = await chai.request(app)
                .post('/api/strategies')
                .set('Content-Type', 'application/json')
                .send(newStrategy);

            const strategyId = createRes.body.id;

            const res = await chai.request(app)
                .get(`/api/strategies/${strategyId}`)
                .set('Content-Type', 'application/json');

            expect(res).to.have.status(200);
            expect(res.body).to.have.property('id', strategyId);
            expect(res.body.name).to.equal(newStrategy.name);
            expect(res.body.description).to.equal(newStrategy.description);
        });

        it('should return 404 if strategy not found', async () => {
            const res = await chai.request(app)
                .get('/api/strategies/999999')
                .set('Content-Type', 'application/json');

            expect(res).to.have.status(404);
        });
    });

    describe('PUT /api/strategies/:id', () => {
        it('should update a strategy', async () => {
            // First create a strategy to update
            const newStrategy = {
                name: 'Strategy to Update',
                description: 'This strategy will be updated',
                status: 'OPEN',
                symbol: 'TEST4'
            };

            const createRes = await chai.request(app)
                .post('/api/strategies')
                .set('Content-Type', 'application/json')
                .send(newStrategy);

            const strategyId = createRes.body.id;

            const updatedStrategy = {
                name: 'Updated Strategy',
                description: 'This strategy has been updated',
                status: 'CLOSED',
                symbol: 'TEST4'
            };

            const res = await chai.request(app)
                .put(`/api/strategies/${strategyId}`)
                .set('Content-Type', 'application/json')
                .send(updatedStrategy);

            expect(res).to.have.status(200);
            expect(res.body.name).to.equal(updatedStrategy.name);
            expect(res.body.description).to.equal(updatedStrategy.description);
            expect(res.body.status).to.equal(updatedStrategy.status);
        });

        it('should return 404 if strategy not found', async () => {
            const updatedStrategy = {
                name: 'Non-existent Strategy',
                description: 'This strategy does not exist',
                status: 'OPEN',
                symbol: 'TEST5'
            };

            const res = await chai.request(app)
                .put('/api/strategies/999999')
                .set('Content-Type', 'application/json')
                .send(updatedStrategy);

            expect(res).to.have.status(404);
        });
    });

    describe('DELETE /api/strategies/:id', () => {
        it('should delete a strategy', async () => {
            // First create a strategy to delete
            const newStrategy = {
                name: 'Strategy to Delete',
                description: 'This strategy will be deleted',
                status: 'OPEN',
                symbol: 'TEST6'
            };

            const createRes = await chai.request(app)
                .post('/api/strategies')
                .set('Content-Type', 'application/json')
                .send(newStrategy);

            const strategyId = createRes.body.id;

            const res = await chai.request(app)
                .delete(`/api/strategies/${strategyId}`)
                .set('Content-Type', 'application/json');

            expect(res).to.have.status(200);

            // Verify the strategy was deleted
            const getRes = await chai.request(app)
                .get(`/api/strategies/${strategyId}`)
                .set('Content-Type', 'application/json');

            expect(getRes).to.have.status(404);
        });

        it('should return 404 if strategy not found', async () => {
            const res = await chai.request(app)
                .delete('/api/strategies/999999')
                .set('Content-Type', 'application/json');

            expect(res).to.have.status(404);
        });
    });
}); 