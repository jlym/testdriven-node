import * as express from "express";

const app = express();
app.get("/hello", (req: express.Request, res: express.Response) => {
    res.send("Hello world");
});

app.listen(3000);

export default app;
