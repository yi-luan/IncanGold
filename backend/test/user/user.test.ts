import { test, describe, beforeAll, afterAll, expect, } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { configDataSource, AppDataSource } from "../../src/Shared/infra/data-source";
import { User } from "../../src/User/infra/User";
import express, { Express } from "express";
import { AuthRouter } from "../../src/User/adapter/Auth.router";
import request from 'supertest'

describe('Functions related to the user', async () => {
    var container: StartedTestContainer;
    var server: Express;

    beforeAll(async () => {
        container = await setupMySqlContainer('123456', 'test');
        await setupOrm(container.getHost(), container.getMappedPort(3306));

        server = express();
        server.use(express.json()); // Restore JSON string back to an object
        server.use('/auth', AuthRouter());
        server.listen(3000,()=>{ console.log('listening in port:8000') })

    }, 30000)

    afterAll(async () => {
        await container.stop();
    });

    test('login', async () => {
        const res = await request(server).post("/auth/login")
        .send({ username: 'johndoe', password: 'password123' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('access_token');
        console.log(res.body['access_token'])
    })
})


async function setupOrm(host: string, port: number) {
    configDataSource(host, port);
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(User);

    const result =  await repo.createQueryBuilder()
        .insert()
        .into(User)
        .values([
            { username: 'johndoe', passwd: 'password123', email: 'johndoe@example.com' },
            { username: 'janedoe', passwd: 'password456', email: 'janedoe@example.com' },
            { username: 'bobsmith', passwd: 'password789', email: 'bobsmith@example.com' }
        ])
        .execute();
}

async function setupMySqlContainer(rootPassword: string, database: string) {
    const container = await new GenericContainer("mysql")
        .withExposedPorts(3306)
        .withEnvironment({ MYSQL_ROOT_PASSWORD: rootPassword, MYSQL_DATABASE: database })
        .start();
    return container;
}