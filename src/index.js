import express from "express";
import { matchRouter } from "./routes/matches.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";

const app = express();
const PORT = 8010;

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

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
