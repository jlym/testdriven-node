import {} from "jest";
import * as supertest from "supertest";
import server from "../src/server";

describe("GET /hello", () => {
    it("should return 200 OK", () => {
        return supertest(server)
            .get("/hello")
            .expect(200);
    });
});
