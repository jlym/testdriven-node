import { } from "jest";
import * as supertest from "supertest";
import * as db from "../src/db-client";
import * as uuid from "uuid/v4";
import { ITimeProvider, User } from "../src/db-client";

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

const addUniqueUser = async (dbClient: db.DbClient): Promise<db.User> => {
    const userName = uniqueUserName();
    const email = userName + "@gmail.com";
    return await dbClient.addUser(userName, email);
};

describe("DbClient", () => {

    const timeProvider = new StaticTimeProvider(new Date());
    const dbClient: db.DbClient = new db.DbClient(
        "localhost", 5432, "users", "postgres", "postgres", timeProvider
    );

    describe("addUser", () => {

        it("adds a user", async () => {
            const userName = uniqueUserName();
            const email = userName + "@gmail.com";

            return dbClient.addUser(userName, email)
                .then(user => {
                    expect(user).toBeDefined();
                    expect(user.id).toBeDefined();
                    expect(user.id.length).toBeGreaterThan(0);
                    expect(user.userName).toEqual(userName);
                    expect(user.email).toEqual(email);
                    expect(user.createdAt).toEqual(timeProvider.nowUTC());
                    expect(user.deletedAt).toBeUndefined();
                    expect(user.active).toBeTruthy();
                });
        });
    });

    describe("getUser", () => {

        it ("returns a user when given a user that was added 1", async () => {
            const addedUser = await addUniqueUser(dbClient);
            expect(addedUser).toBeDefined();

            const returnedUser = await dbClient.getUser(addedUser.id);

            expect(returnedUser).toBeDefined();
            expect(returnedUser.id).toEqual(addedUser.id);
            expect(returnedUser.userName).toEqual(addedUser.userName);
            expect(returnedUser.email).toEqual(addedUser.email);
            expect(returnedUser.createdAt).toEqual(addedUser.createdAt);
            expect(returnedUser.deletedAt).toBeUndefined();
            expect(returnedUser.active).toBeTruthy();
        });

        it ("returns undefined when given an unknown user ID", async () => {
            const returnedUser = await dbClient.getUser("UNKNOWN");
            expect(returnedUser).toBeUndefined();
        });
    });

    describe("getUsers", () => {

        it ("iterates through all users that were added", async () => {
            const addedUserIDs: string[] = [];
            const numUsers = 5;
            for (let i = 0; i < numUsers; i++) {
                const addedUser = await addUniqueUser(dbClient);
                expect(addedUser).toBeDefined();
                addedUserIDs.push(addedUser.id);
            }

            const allReturnedUserIDs: string[] = [];
            let offset = 0;
            while (true) {
                const limit = 4;
                const returnedUsers = await dbClient.getUsers(offset, limit);

                expect(returnedUsers).toBeDefined();
                expect(returnedUsers.length).toBeLessThanOrEqual(limit);
                if (returnedUsers.length === 0) {
                    break;
                }

                for (let i = 0; i < returnedUsers.length; i++) {
                    allReturnedUserIDs.push(returnedUsers[i].id);
                }

                offset += returnedUsers.length;
            }

            // Assert there are no duplicates in the list.
            const seenUserIDs = new Set<string>();
            addedUserIDs.forEach((addedID, i) => {
                expect(seenUserIDs.has(addedID)).toBeFalsy();
                seenUserIDs.add(addedID);
            });

            // Verify that the users that we added at the beginning of the test are in the list.
            addedUserIDs.forEach((addedID, i) => {
                expect(allReturnedUserIDs).toContain(addedID);
            });
        });
    });

    describe("deleteUser", () => {

        it ("returns a user when given a user ID that exists", async () => {
            const addedUser = await addUniqueUser(dbClient);
            expect(addedUser).toBeDefined();

            let returnedUser = await dbClient.deleteUser(addedUser.id);
            expect(returnedUser).toBeDefined();
            expect(returnedUser.id).toEqual(addedUser.id);

            returnedUser = await dbClient.deleteUser(addedUser.id);
            expect(returnedUser).toBeUndefined();
        });

        it ("returns undefined when given an unknown user ID", async () => {
            const returnedUser = await dbClient.deleteUser("unknown");
            expect(returnedUser).toBeUndefined();
        });
    });

    describe("updateUser", () => {

        it ("returns a user when given a user ID that exists", async () => {
            const addedUser = await addUniqueUser(dbClient);
            expect(addedUser).toBeDefined();

            const userName = uniqueUserName();
            const email = userName + "@gmail.com";

            const userWithUpdates: db.UpdateUserArgs = {
                id: addedUser.id,
                userName: userName,
                email: email,
                active: true
            };
            const returnedUser = await dbClient.updateUser(userWithUpdates);
            expect(returnedUser).toBeDefined();
            expect(returnedUser.id).toEqual(addedUser.id);
            expect(returnedUser.userName).toEqual(userWithUpdates.userName);
            expect(returnedUser.email).toEqual(userWithUpdates.email);
        });

        it ("returns undefined when given an unknown user ID", async () => {
            const userName = uniqueUserName();
            const email = userName + "@gmail.com";

            const userWithUpdates: db.UpdateUserArgs = {
                id: "unknown",
                userName: userName,
                email: email,
                active: true
            };

            const returnedUser = await dbClient.updateUser(userWithUpdates);
            expect(returnedUser).toBeUndefined();
        });
    });
});
