import { Pool, ConnectionConfig } from "pg";

export interface User {
    id: string;
    userName: string;
    email: string;
    active: boolean;
    createdAt: Date;
    deletedAt?: boolean;
}

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
        const text = "INSERT INTO users(username, email, active, created_at) VALUES ($1, $2, $3, $4) RETURNING *;"
        const now = this.timeProvider.nowUTC();
        const values = [userName, email, true, now];

        return this.pool.query(text, values)
            .then(res => {
                const row = res.rows[0];
                const user: User = {
                    id: row.id,
                    userName: row["username"],
                    email: row["email"] as string,
                    active: row["active"] as boolean,
                    createdAt: row["created_at"] as Date,
                    deletedAt: row["deleted_at"] as boolean
                };
                return user;
            });
    }
}
