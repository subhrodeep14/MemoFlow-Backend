
// server.js

require("dotenv").config();

const express =
  require("express");

const helmet =
  require("helmet");

const cors =
  require("cors");

const cookieParser =
  require("cookie-parser");

const compression =
  require("compression");

/*
──────────────────────────────────────
ROUTES
──────────────────────────────────────
*/

const authRoutes =
  require("./routes/auth.routes");

const memoRoutes =
  require("./routes/memo.routes");

const activityRoutes =
  require("./routes/activity.routes");

const fileRoutes =
  require("./routes/file.routes");

const calendarRoutes =
  require("./routes/calendar.routes");

const entryRoutes =
  require("./routes/entry.routes");

const companyRoutes =
  require("./routes/company.routes");

const purposeRoutes =
  require("./routes/purpose.routes");
const googleAuthRoutes =
  require(
    "./routes/googleAuth.routes"
  );

/*
──────────────────────────────────────
MIDDLEWARE
──────────────────────────────────────
*/

const {
  globalRateLimiter,
} = require(
  "./middleware/rateLimiter"
);

const {
  errorHandler,
} = require(
  "./middleware/errorHandler"
);

/*
──────────────────────────────────────
APP
──────────────────────────────────────
*/

const app =
  express();

const PORT =
  process.env.PORT ||
  5001;

/*
──────────────────────────────────────
TRUST PROXY
IMPORTANT FOR RENDER
──────────────────────────────────────
*/

app.set(
  "trust proxy",
  1
);

/*
──────────────────────────────────────
ALLOWED ORIGINS
──────────────────────────────────────
*/

const allowedOrigins =
  [
    "http://localhost:5173",

    "http://127.0.0.1:5173",

    "https://memo.dhpecrm.in",

    "https://document-store-frontend.vercel.app",
  ];

/*
──────────────────────────────────────
HELMET
──────────────────────────────────────
*/

app.use(
  helmet({
    crossOriginEmbedderPolicy:
      false,

    contentSecurityPolicy:
      false,
  })
);

/*
──────────────────────────────────────
CORS
IMPORTANT
──────────────────────────────────────
*/

const corsOptions = {
  /*
  ORIGIN
  */

  origin: function (
    origin,
    callback
  ) {
    /*
    NO ORIGIN
    */

    if (!origin) {
      return callback(
        null,
        true
      );
    }

    /*
    ALLOWED
    */

    if (
      allowedOrigins.includes(
        origin
      )
    ) {
      return callback(
        null,
        true
      );
    }

    /*
    BLOCKED
    */

    console.error(
      "❌ Blocked by CORS:",
      origin
    );

    return callback(
      new Error(
        "Not allowed by CORS"
      )
    );
  },

  /*
  COOKIE
  */

  credentials: true,

  /*
  METHODS
  */

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  /*
  IMPORTANT
  CUSTOM HEADERS
  */

  allowedHeaders: [
    "Content-Type",

    "Authorization",

    "x-company-id",
  ],
};

/*
──────────────────────────────────────
ENABLE CORS
──────────────────────────────────────
*/

app.use(
  cors(corsOptions)
);

/*
──────────────────────────────────────
PREFLIGHT
IMPORTANT
──────────────────────────────────────
*/

app.options(
  "*",
  cors(corsOptions)
);

/*
──────────────────────────────────────
GENERAL MIDDLEWARE
──────────────────────────────────────
*/

app.use(
  compression()
);

app.use(
  express.json({
    limit: "25mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,

    limit: "25mb",
  })
);

app.use(
  cookieParser()
);

/*
──────────────────────────────────────
RATE LIMIT
──────────────────────────────────────
*/

app.use(
  "/api/",
  globalRateLimiter
);

/*
──────────────────────────────────────
ROUTES
──────────────────────────────────────
*/
app.use(
  "/auth",
  googleAuthRoutes
);
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/memos",
  memoRoutes
);

app.use(
  "/api/activities",
  activityRoutes
);

app.use(
  "/api/files",
  fileRoutes
);

app.use(
  "/api/calendar",
  calendarRoutes
);

app.use(
  "/api/entry",
  entryRoutes
);

app.use(
  "/api/companies",
  companyRoutes
);

app.use(
  "/api/purposes",
  purposeRoutes
);

/*
──────────────────────────────────────
HEALTH
──────────────────────────────────────
*/

app.get(
  "/api/health",
  (
    req,
    res
  ) => {
    return res.json({
      success: true,

      status: "ok",

      environment:
        process.env
          .NODE_ENV ||
        "development",

      timestamp:
        new Date().toISOString(),
    });
  }
);

/*
──────────────────────────────────────
ROOT
──────────────────────────────────────
*/

app.get(
  "/",
  (
    req,
    res
  ) => {
    res.json({
      app: "Secure CalDoc API",

      status: "running",
    });
  }
);

/*
──────────────────────────────────────
404
──────────────────────────────────────
*/

app.use(
  "*",
  (
    req,
    res
  ) => {
    res.status(404).json({
      error:
        "Route not found",
    });
  }
);

/*
──────────────────────────────────────
ERROR HANDLER
──────────────────────────────────────
*/

app.use(
  errorHandler
);

/*
──────────────────────────────────────
START
──────────────────────────────────────
*/

app.listen(
  PORT,
  () => {
    console.log(`
🚀 Secure CalDoc API Running
🌍 PORT: ${PORT}
🛡️ ENV: ${
      process.env
        .NODE_ENV ||
      "development"
    }
    `);
  }
);

module.exports =
  app;

