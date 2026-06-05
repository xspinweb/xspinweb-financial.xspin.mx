import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { healthRouter } from "./routes/health.js";
import { investmentsRouter } from "./routes/investments.js";
import { investorsRouter } from "./routes/investors.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/dashboard", dashboardRouter);
app.use("/investors", investorsRouter);
app.use("/investments", investmentsRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof Error) {
    res.status(400).json({
      error: error.message
    });
    return;
  }

  res.status(500).json({
    error: "Error interno"
  });
});

app.listen(config.port, () => {
  console.log(`Pay Financial API running on http://localhost:${config.port}`);
});
