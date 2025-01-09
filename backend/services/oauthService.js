const { AuthorizationCode } = require("simple-oauth2");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const UserService = require("./userService");
const oauthConfig = require("../config/oauth.config");

class OAuth2Service {
  constructor() {
    this.tokenSecret = process.env.JWT_SECRET_KEY;
    this.userService = new UserService();
    this.employmentTypeMapping = {
      fulltime: "Full-Time",
      parttime: "Part-Time",
      temporary: "Temporary",
      designee: "Designee",
    };

    this.oauth2 = this._initializeOAuth2Client();
    this.authCodes = new Map();
    this.authCodeTimeouts = new Map();
    this.revokedTokens = new Set();
  }

  _initializeOAuth2Client() {
    return new AuthorizationCode({
      client: {
        id: process.env.FLSS_CLIENT_ID,
        secret: process.env.FLSS_CLIENT_SECRET,
      },
      auth: {
        tokenHost: process.env.HRIS_TOKEN_HOST || "http://localhost:3000",
        tokenPath: "/oauth/token",
        authorizePath: "/oauth/authorize",
        revokePath: "/oauth/revoke",
      },
    });
  }

  /**
   * @section Auth Code Management
   * Methods for handling authorization code generation and validation
   */
  async generateAuthCode(userId, clientId, redirectUri, state) {
    const code = this._generateSecureCode();
    const codeData = {
      userId,
      clientId,
      redirectUri,
      createdAt: Date.now(),
    };

    this.authCodes.set(code, codeData);
    this._setAuthCodeExpiry(code);

    return code;
  }

  _generateSecureCode() {
    return crypto.randomBytes(32).toString("hex");
  }

  _setAuthCodeExpiry(code) {
    if (this.authCodeTimeouts.has(code)) {
      clearTimeout(this.authCodeTimeouts.get(code));
    }

    const timeout = setTimeout(() => {
      this.authCodes.delete(code);
      this.authCodeTimeouts.delete(code);
    }, oauthConfig.oauth.authCodeExpiryMs);

    this.authCodeTimeouts.set(code, timeout);
  }

  _validateAuthCode(code, clientId) {
    const codeData = this.authCodes.get(code);
    if (!codeData || codeData.clientId !== clientId) {
      throw new Error(oauthConfig.errors.invalidClient);
    }

    if (this.authCodeTimeouts.has(code)) {
      clearTimeout(this.authCodeTimeouts.get(code));
      this.authCodeTimeouts.delete(code);
    }

    this.authCodes.delete(code);
    return codeData;
  }

  /**
   * @section Token Management
   * Methods for handling token generation, validation and revocation
   */
  async exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
    const codeData = this._validateAuthCode(code, clientId);

    if (codeData.redirectUri !== redirectUri) {
      throw new Error(oauthConfig.errors.invalidClient);
    }

    const userData = await this._getUserDataForToken(codeData.userId);
    return this.generateToken(userData);
  }

  async generateToken(userData) {
    try {
      const payload = this._createTokenPayload(userData);
      const accessToken = this._signToken(payload);
      return this._createTokenResponse(accessToken, payload);
    } catch (error) {
      console.error("Token generation error:", error);
      throw error;
    }
  }

  _createTokenPayload(userData) {
    return {
      sub: userData.UserID,
      type: "access_token",
      iat: Math.floor(Date.now() / 1000),
      exp:
        Math.floor(Date.now() / 1000) +
        this._getExpiresInSeconds(oauthConfig.token.expiresIn),
      aud: process.env.FLSS_CLIENT_ID,
      iss: process.env.HRIS_TOKEN_HOST || "http://localhost:3000",
      ...this._filterFacultyData(userData),
    };
  }

  _signToken(payload) {
    return jwt.sign(payload, this.tokenSecret, {
      algorithm: oauthConfig.token.algorithm,
    });
  }

  _createTokenResponse(accessToken, payload) {
    return {
      access_token: accessToken,
      token_type: oauthConfig.oauth.tokenType,
      expires_in: this._getExpiresInSeconds(oauthConfig.token.expiresIn),
      faculty_data: payload,
    };
  }

  validateToken(token) {
    try {
      if (this.revokedTokens.has(token)) {
        return null;
      }
      return jwt.verify(token, this.tokenSecret);
    } catch (error) {
      return null;
    }
  }

  async revokeToken(token) {
    try {
      const decoded = jwt.verify(token, this.tokenSecret);
      this.revokedTokens.add(token);

      this._cleanupRevokedTokens();

      return true;
    } catch (error) {
      console.error("Token revocation error:", error);
      return false;
    }
  }

  _cleanupRevokedTokens() {
    for (const token of this.revokedTokens) {
      try {
        jwt.verify(token, this.tokenSecret);
      } catch (error) {
        this.revokedTokens.delete(token);
      }
    }
  }

  /**
   * @section Client Validation
   * Methods for validating OAuth clients and their credentials
   */
  async validateClient(clientId, clientSecret, redirectUri) {
    try {
      console.log("Validating client:", {
        clientId,
        hasSecret: !!clientSecret,
        redirectUri,
        configuredClient: oauthConfig.clients[clientId],
      });

      const client = oauthConfig.clients[clientId];
      if (!this._isValidClient(client, clientSecret)) {
        console.log("Invalid client credentials");
        return false;
      }

      const isValidRedirect = this._isValidRedirectUri(client, redirectUri);
      console.log("Redirect URI validation:", {
        isValid: isValidRedirect,
        provided: redirectUri,
        configured: client.redirectUris,
      });

      return isValidRedirect;
    } catch (error) {
      console.error("Client validation error:", error);
      return false;
    }
  }

  _isValidClient(client, clientSecret) {
    if (!client) return false;
    if (clientSecret && client.clientSecret !== clientSecret) return false;
    return true;
  }

  _isValidRedirectUri(client, redirectUri) {
    if (client.redirectUris?.length > 0) {
      if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
        console.error("Invalid redirect URI:", redirectUri);
        return false;
      }
    }
    return true;
  }

  /**
   * @section User Data Management
   * Methods for handling user data retrieval and transformation
   */
  async getUserData(userId) {
    try {
      return await this.userService.getUserById(userId);
    } catch (error) {
      console.error("Error getting user data:", error);
      throw new Error(oauthConfig.errors.userNotFound);
    }
  }

  async _getUserDataForToken(userId) {
    const userData = await this.getUserData(userId);
    if (!userData) {
      console.error("User not found for ID:", userId);
      throw new Error(oauthConfig.errors.userNotFound);
    }
    return userData;
  }

  _filterFacultyData(userData) {
    const filtered = {};
    oauthConfig.facultyDataFields.forEach((field) => {
      if (userData[field] !== undefined) {
        this._mapFieldToFiltered(field, userData[field], filtered);
      }
    });
    return filtered;
  }

  _mapFieldToFiltered(field, value, filtered) {
    switch (field) {
      case "isActive":
        filtered.status = value ? "Active" : "Inactive";
        break;
      case "EmploymentType":
        filtered.faculty_type =
          this.employmentTypeMapping[value.toLowerCase()] ||
          value.toLowerCase();
        break;
      case "Surname":
        filtered.last_name = value;
        break;
      case "FirstName":
        filtered.first_name = value;
        break;
      case "MiddleName":
        filtered.middle_name = value || null;
        break;
      case "NameExtension":
        filtered.name_extension = value || null;
        break;
      case "Fcode":
        filtered.faculty_code = value;
        break;
      default:
        filtered[field] = value;
    }
  }

  /**
   * @section Utility Methods
   * Helper methods for various operations
   */
  _getExpiresInSeconds(expiresIn) {
    const units = {
      h: 3600,
      d: 86400,
      w: 604800,
    };
    const match = expiresIn.match(/(\d+)([hdw])/);
    if (match) {
      const [_, number, unit] = match;
      return parseInt(number) * (units[unit] || 1);
    }
    return 86400;
  }

  async getClientInfo(clientId) {
    try {
      const client = oauthConfig.clients[clientId];
      if (!client) {
        return null;
      }
      return {
        name: client.name,
        description: client.description,
      };
    } catch (error) {
      console.error("Error getting client info:", error);
      return null;
    }
  }
}

module.exports = OAuth2Service;
