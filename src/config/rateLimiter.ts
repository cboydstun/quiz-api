// config/rateLimiter.ts

import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration attempts per windowMs
  message: "Too many registration attempts, please try again later.",
});

export const applyRateLimiting = (app: any) => {
  app.use(generalLimiter);
  app.use("/graphql", (req: any, res: any, next: any) => {
    const query = req.body.query || "";
    if (query.includes("mutation") && query.includes("login")) {
      return loginLimiter(req, res, next);
    }
    if (query.includes("mutation") && query.includes("register")) {
      return registerLimiter(req, res, next);
    }
    next();
  });
};