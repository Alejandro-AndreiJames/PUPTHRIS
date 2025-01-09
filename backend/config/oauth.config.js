const config = {
  token: {
    expiresIn: "24h",
    algorithm: "HS256",
  },

  oauth: {
    grantType: "authorization_code",
    responseType: "code",
    tokenType: "Bearer",
    authCodeExpiryMs: 600000,
  },

  errors: {
    invalidResponseType: "Invalid response type",
    invalidGrantType: "Invalid grant type",
    invalidClient: "Invalid client",
    invalidCredentials: "Invalid credentials",
    invalidToken: "Invalid token",
    noToken: "No token provided",
    missingParams: "Missing OAuth parameters",
    userNotFound: "User not found",
    serverError: "Internal server error",
  },

  clients: {
    [process.env.FLSS_CLIENT_ID]: {
      clientId: process.env.FLSS_CLIENT_ID,
      clientSecret: process.env.FLSS_CLIENT_SECRET,
      name: "PUPT Faculty Loading and Scheduling System",
      redirectUris: [
        "http://localhost:4201/auth/callback",
        "https://pupt-flss.com/auth/callback",
      ],
    },
  },

  allowedOrigins: {
    origins: ["*"],
    credentials: true,
  },

  facultyDataFields: [
    "UserID",
    "Fcode",
    "FirstName",
    "Surname",
    "MiddleName",
    "NameExtension",
    "Email",
    "EmploymentType",
    "isActive",
  ],
};

module.exports = config;
