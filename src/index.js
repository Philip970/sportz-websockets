import express from "express";
import { matchRouter } from "./routes/matches.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";
import http from "http";
import { attachWebSocketServer } from "./ws/server.js";

const app = express();
const PORT = process.env.PORT || 8010;
const HOST = process.env.HOST || "0.0.0.0";

const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running.");
});

app.use("/matches", matchRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Invalid JSON body.",
      details: "Check JSON syntax (no trailing comma, valid quotes).",
    });
  }

  return next(err);
});

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);
  console.log(`Server started at ${baseUrl.replace("http", "ws")}/ws`);
});
