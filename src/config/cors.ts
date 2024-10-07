// config/cors.ts

export const corsOptions = {
  origin: "https://www.dronepilotquiz.com", // Allow only your frontend domain
  credentials: true,                        // Allow cookies and credentials
  methods: ['GET', 'POST', 'OPTIONS'],      // Specify allowed methods
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'Authorization'], // Specify allowed headers
};
