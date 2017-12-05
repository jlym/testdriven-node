import { Pool, ConnectionConfig, QueryResult } from "pg";
import * as uuid from "uuid/v4";

export class User {
    id: string;
    userName: string;
    email: string;
    active: boolean;
    createdAt: Date;
    deletedAt: Date;

    public constructor(init?: Partial<User>) {
        Object.assign(this, init);
    }
}

export interface UpdateUserArgs {
    id: string;
    userName?: string;
    email?: string;
    active?: boolean;
}

/**
 * ITimeProvider contains a method that provides the current time.  It is meant to allow
 * tests to control the current time.
 */
export interface ITimeProvider {
    nowUTC(): Date;
}

class DefaultTimeProvider implements ITimeProvider {
    nowUTC(): Date {
        const now = new Date();
        return new Date(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds());
    }
}

export class DbClient {

    pool: Pool;
    timeProvider: ITimeProvider;

    /**
     * Creates a DbClient with specific connection params.
     * @param timeProvider Optionally provide a timeProvider object to allow the client to get
     * the current time.  Meant to allow tests to specify the current time.
     */
    constructor(
        host: string,
        port: number,
        database: string,
        user: string,
        password: string,
        timeProvider?: ITimeProvider
    ) {
        const config: ConnectionConfig = {
            user: user,
            database: database,
            password: password,
            port: port,
            host: host,
        };
        this.pool = new Pool(config);

        this.timeProvider =
            timeProvider ?
                timeProvider :
                new DefaultTimeProvider();
    }

    addUser(userName: string, email: string): Promise<User> {
        const text = `
            INSERT INTO users(user_id, username, email, active, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;`;
        const userID: string = uuid();
        const now = this.timeProvider.nowUTC();
        const values = [userID, userName, email, true, now];

        return this.pool.query(text, values)
            .then(this.readUserFromQueryResult);
    }

    async getUser(userID: string): Promise<User> {
        const text = "SELECT * FROM users WHERE user_id = $1;";
        const values = [userID];

        const result = await this.pool.query(text, values);
        return this.readUserFromQueryResult(result);
    }

    async deleteUser(userID: string): Promise<User> {
        const text = `
            DELETE FROM users
            WHERE user_id = $1
            RETURNING *;`;
        const now = this.timeProvider.nowUTC();
        const values = [userID];

        const result = await this.pool.query(text, values);
        return this.readUserFromQueryResult(result);
    }

    async updateUser(user: UpdateUserArgs): Promise<User> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let valuePlaceholder: number = 1;
        if (user.userName != undefined) {
            values.push(user.userName);
            setClauses.push(`username = $${valuePlaceholder}`);
            valuePlaceholder++;
        }
        if (user.active != undefined) {
            values.push(user.active);
            setClauses.push(`active = $${valuePlaceholder}`);
            valuePlaceholder++;
        }
        if (user.email != undefined) {
            values.push(user.email);
            setClauses.push(`email = $${valuePlaceholder}`);
            valuePlaceholder++;
        }
        const setClause = "SET " + setClauses.join(", ");

        const text = `
            UPDATE users
            ${setClause}
            WHERE user_id = $${valuePlaceholder}
            RETURNING *;`;
        values.push(user.id);

        const result = await this.pool.query(text, values);
        return this.readUserFromQueryResult(result);
    }

    private readUserFromQueryResult(result: QueryResult): User {
        if (result.rowCount > 1) {
            throw new Error(`Expected that query would return at most 1 User, but it returned ${result.rowCount}.`);
        }
        else if (result.rowCount == 0) {
            return undefined;
        }

        const row = result.rows[0];
        const user: User = new User();

        if (row["user_id"] != undefined) {
            user.id = row["user_id"];
        }
        if (row["username"] != undefined) {
            user.userName = row["username"];
        }
        if (row["email"] != undefined) {
            user.email = row["email"];
        }
        if (row["active"] != undefined) {
            user.active = row["active"];
        }
        if (row["created_at"] != undefined) {
            user.createdAt = row["created_at"];
        }
        if (row["deleted_at"] != undefined) {
            user.deletedAt = row["deleted_at"];
        }

        return user;
    }
}
