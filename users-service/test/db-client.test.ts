import { } from "jest";
import * as supertest from "supertest";
import * as db from "../src/db-client";
import * as uuid from "uuid/v4";
import { ITimeProvider } from "../src/db-client";

const uniqueUserName = (): string => {
    let userName: string = uuid();
    userName = userName.replace("-", "");
    // Add a prefix so that the username doesn't start with a number
    return "user" + userName;
};

class StaticTimeProvider implements ITimeProvider {
    date: Date;
    constructor(date: Date) {
        this.date = new Date(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
            date.getUTCHours(),
            date.getUTCMinutes(),
            date.getUTCSeconds());
    }
    nowUTC(): Date {
        return this.date;
    }
}

describe("DbClient", () => {

    const timeProvider = new StaticTimeProvider(new Date());
    const dbClient: db.DbClient = new db.DbClient(
        "localhost", 5432, "users", "postgres", "postgres", timeProvider
    );

    describe("addUser", () => {
        it("adds a user", () => {
            const userName = uniqueUserName();
            const email = uniqueUserName + "@gmail.com";

            return dbClient.addUser(userName, email)
                .then(user => {
                    expect(user).toBeDefined();
                    expect(user.id).toBeDefined();
                    expect(user.id.length).toBeGreaterThan(0);
                    expect(user.userName).toEqual(userName);
                    expect(user.email).toEqual(email);
                    expect(user.createdAt).toEqual(timeProvider.nowUTC());
                    expect(user.deletedAt).toBeNull();
                    expect(user.active).toBeTruthy();
                });
        });
    });
});
