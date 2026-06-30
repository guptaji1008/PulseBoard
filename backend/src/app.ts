import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { apiLimiter } from "./middleware/rateLimit";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { openapiSpec } from "./docs/swagger";
import authRoutes from "./modules/auth/auth.routes";
import projectRoutes from "./modules/projects/project.routes";
import { projectTaskRouter, taskRouter } from "./modules/tasks/task.routes";
import searchRoutes from "./modules/search/search.routes";
import aiRoutes from "./modules/ai/ai.routes";

const allowedOrigins = env.corsOrigin.split(",").map((o) => o.trim());

function corsOrigin(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void
): void {
  // No origin header = same-origin / server-to-server request → allow
  if (!origin) return cb(null, true);
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin))
    return cb(null, true);
  cb(null, false);
}

const corsOptions: cors.CorsOptions = { origin: corsOrigin, credentials: true };

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      // Disable same-origin policy — this is a cross-origin API
      crossOriginResourcePolicy: false,
    })
  );
  // Handle OPTIONS pre-flight explicitly before any auth/rate-limit middleware
  app.options("*", cors(corsOptions));
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());
  if (env.nodeEnv !== "test") app.use(morgan("dev"));

  app.get("/health", (_req, res) =>
    res.json({ status: "ok", uptime: process.uptime() })
  );

  app.use("/api", apiLimiter);
  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/projects/:projectId/tasks", projectTaskRouter);
  app.use("/api/tasks", taskRouter);
  app.use("/api/search", searchRoutes);
  app.use("/api/projects", aiRoutes);

  app.get("/api/docs.json", (_req, res) => res.json(openapiSpec));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
