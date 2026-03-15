// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment: process.env.NODE_ENV,

  // Filter sensitive data
  beforeSend(event) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }

    // Remove sensitive data from request body
    if (event.request?.data) {
      const data =
        typeof event.request.data === "string"
          ? JSON.parse(event.request.data)
          : event.request.data;

      if (data.password) data.password = "[REDACTED]";
      if (data.email) data.email = "[REDACTED]";
      if (data.token) data.token = "[REDACTED]";

      event.request.data =
        typeof event.request.data === "string"
          ? JSON.stringify(data)
          : data;
    }

    return event;
  },
});
