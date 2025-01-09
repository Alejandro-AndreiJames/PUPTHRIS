const axios = require("axios");
require('dotenv').config();

// Configuration
const config = {
  baseURL: "http://localhost:3000",
  clientId: process.env.FLSS_CLIENT_ID,
  clientSecret: process.env.FLSS_CLIENT_SECRET,
  testCredentials: {
    username: "valid-hris-faculty-email",
    password: "valid-hris-faculty-password",
  },
  invalidCredentials: {
    username: "invalid@example.com",
    password: "wrongpassword",
  },
};

// Test OAuth flow
async function testOAuthFlow() {
  try {
    console.log("1. Testing token generation with valid credentials...");
    // Request access token
    const tokenResponse = await axios.post(`${config.baseURL}/oauth/token`, {
      username: config.testCredentials.username,
      password: config.testCredentials.password,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    console.log("\nToken Response:");
    console.log(JSON.stringify(tokenResponse.data, null, 2));

    // Verify token structure
    console.log("\nVerifying token response structure...");
    const requiredFields = [
      "access_token",
      "token_type",
      "expires_in",
      "faculty_data",
    ];
    const missingFields = requiredFields.filter(
      (field) => !(field in tokenResponse.data)
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields in token response: ${missingFields.join(", ")}`
      );
    }
    console.log("✅ Token response structure is valid");

    if (tokenResponse.data.access_token) {
      console.log("\n2. Testing token validation...");
      // Validate the received token
      const validationResponse = await axios.post(
        `${config.baseURL}/oauth/validate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.data.access_token}`,
          },
        }
      );

      console.log("\nValidation Response:");
      console.log(JSON.stringify(validationResponse.data, null, 2));

      // Test invalid token
      console.log("\n3. Testing invalid token validation...");
      try {
        await axios.post(
          `${config.baseURL}/oauth/validate`,
          {},
          {
            headers: {
              Authorization: "Bearer invalid_token",
            },
          }
        );
        throw new Error("Invalid token validation should have failed");
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log("✅ Invalid token correctly rejected");
        } else {
          throw error;
        }
      }

      // Test invalid credentials
      console.log("\n4. Testing invalid credentials...");
      try {
        await axios.post(`${config.baseURL}/oauth/token`, {
          username: config.invalidCredentials.username,
          password: config.invalidCredentials.password,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        });
        throw new Error("Invalid credentials should have failed");
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log("✅ Invalid credentials correctly rejected");
        } else {
          throw error;
        }
      }

      // Test invalid client credentials
      console.log("\n5. Testing invalid client credentials...");
      try {
        await axios.post(`${config.baseURL}/oauth/token`, {
          username: config.testCredentials.username,
          password: config.testCredentials.password,
          client_id: "invalid_client",
          client_secret: "invalid_secret",
        });
        throw new Error("Invalid client credentials should have failed");
      } catch (error) {
        if (error.response && error.response.status === 401) {
          console.log("✅ Invalid client credentials correctly rejected");
        } else {
          throw error;
        }
      }
    }

    console.log("\n✅ OAuth flow test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during OAuth flow test:");
    if (error.response) {
      // Server responded with error
      console.error("Status:", error.response.status);
      console.error("Error:", error.response.data);
    } else {
      // Network error or other issues
      console.error("Error:", error.message);
    }
    process.exit(1);
  }
}

// Run the test
console.log("Starting OAuth Client Integration Test...\n");
testOAuthFlow();
