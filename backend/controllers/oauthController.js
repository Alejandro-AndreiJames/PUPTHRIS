const OAuth2Service = require("../services/oauthService");
const UserService = require("../services/userService");
const OAuthConsent = require("../models/OAuthConsent");
const oauthConfig = require("../config/oauth.config");

class OAuthController {
  constructor() {
    this.oauth2Service = new OAuth2Service();
    this.userService = new UserService();

    this.authorize = this.authorize.bind(this);
    this.login = this.login.bind(this);
    this.token = this.token.bind(this);
    this.validateToken = this.validateToken.bind(this);
    this.getClientInfo = this.getClientInfo.bind(this);
  }

  /**
   * @section Main Route Handlers
   * Primary OAuth endpoint handlers
   */
  async authorize(req, res) {
    try {
      const { client_id, redirect_uri, state, response_type, user_id } =
        req.body;
      console.log("Authorization request with state:", state);

      if (!this._isValidResponseType(response_type, res)) return;
      if (!(await this._validateClient(client_id, null, redirect_uri, res)))
        return;

      // Check if consent already exists
      const existingConsent = await OAuthConsent.findOne({
        where: { userId: user_id, clientId: client_id },
      });

      if (existingConsent) {
        // User has already consented, generate code directly
        const code = await this._generateAuthCode(user_id, {
          client_id,
          redirect_uri,
          state,
        });
        this._sendRedirectResponse(res, redirect_uri, code, state);
      } else {
        // Store new consent
        await OAuthConsent.create({
          userId: user_id,
          clientId: client_id,
          scopes: "profile",
        });

        const code = await this._generateAuthCode(user_id, {
          client_id,
          redirect_uri,
          state,
        });
        this._sendRedirectResponse(res, redirect_uri, code, state);
      }
    } catch (error) {
      this._handleError(error, res);
    }
  }

  async login(req, res) {
    try {
      const { email, password, client_id, redirect_uri, state, response_type } =
        req.body;

      if (!this._isValidResponseType(response_type, res)) return;
      if (!(await this._validateClient(client_id, null, redirect_uri, res)))
        return;

      const user = await this._authenticateUser(req.body, res);
      if (!user) return;

      // Check if user has already consented
      const existingConsent = await OAuthConsent.findOne({
        where: { userId: user.UserID, clientId: client_id },
      });

      if (existingConsent) {
        // User has already consented, generate code directly
        const code = await this._generateAuthCode(user.UserID, {
          client_id,
          redirect_uri,
          state,
        });
        this._sendRedirectResponse(res, redirect_uri, code, state);
      } else {
        // Return user ID for consent page
        res.json({ user_id: user.UserID });
      }
    } catch (error) {
      this._handleError(error, res);
    }
  }

  async getClientInfo(req, res) {
    try {
      const { clientId } = req.params;
      const clientInfo = await this.oauth2Service.getClientInfo(clientId);

      if (!clientInfo) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json(clientInfo);
    } catch (error) {
      this._handleError(error, res);
    }
  }

  async token(req, res) {
    try {
      const { grant_type, code, redirect_uri, client_id, client_secret } =
        req.body;

      if (!this._isValidGrantType(grant_type, res)) return;
      if (
        !(await this._validateClient(
          client_id,
          client_secret,
          redirect_uri,
          res
        ))
      )
        return;

      const token = await this.oauth2Service.exchangeCodeForToken(
        code,
        client_id,
        client_secret,
        redirect_uri
      );

      res.json(token);
    } catch (error) {
      this._handleError(error, res);
    }
  }

  async validateToken(req, res) {
    try {
      const token = this._extractToken(req.headers.authorization);
      if (!token) {
        return res.status(401).json({ error: oauthConfig.errors.noToken });
      }

      const tokenData = this.oauth2Service.validateToken(token);
      if (!tokenData) {
        return res.status(401).json({ error: oauthConfig.errors.invalidToken });
      }

      res.json(tokenData);
    } catch (error) {
      this._handleError(error, res);
    }
  }

  /**
   * @section Validation Helpers
   * Methods for validating OAuth requests and credentials
   */
  _isValidResponseType(responseType, res) {
    if (responseType !== oauthConfig.oauth.responseType) {
      res.status(400).json({ error: oauthConfig.errors.invalidResponseType });
      return false;
    }
    return true;
  }

  _isValidGrantType(grantType, res) {
    if (grantType !== oauthConfig.oauth.grantType) {
      res.status(400).json({ error: oauthConfig.errors.invalidGrantType });
      return false;
    }
    return true;
  }

  async _validateClient(clientId, clientSecret, redirectUri, res) {
    if (
      !(await this.oauth2Service.validateClient(
        clientId,
        clientSecret,
        redirectUri
      ))
    ) {
      res.status(401).json({ error: oauthConfig.errors.invalidClient });
      return false;
    }
    return true;
  }

  async _authenticateUser(credentials, res) {
    const user = await this.userService.authenticate(
      credentials.email,
      credentials.password
    );

    if (!user) {
      res.status(401).json({ error: oauthConfig.errors.invalidCredentials });
      return null;
    }

    if (user.error === "UNAUTHORIZED_ROLE") {
      res.status(403).json({ error: "Only faculty members can proceed." });
      return null;
    }

    console.log("Authenticated user:", {
      id: user.UserID,
      email: user.Email,
    });

    return user;
  }

  /**
   * @section Response Handling
   * Methods for managing HTTP responses and redirects
   */
  _sendRedirectResponse(res, redirectUri, code, state) {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.append("code", code);
    redirectUrl.searchParams.append("state", state);
    res.json({ redirect_url: redirectUrl.toString() });
  }

  _extractToken(authHeader) {
    if (
      !authHeader ||
      !authHeader.startsWith(oauthConfig.oauth.tokenType + " ")
    ) {
      return null;
    }
    return authHeader.split(" ")[1];
  }

  _handleError(error, res) {
    console.error("OAuth error:", error);
    res.status(500).json({ error: oauthConfig.errors.serverError });
  }

  /**
   * @section Auth Code Generation
   * Methods for generating authorization codes
   */
  async _generateAuthCode(userId, params) {
    return await this.oauth2Service.generateAuthCode(
      userId,
      params.client_id,
      params.redirect_uri,
      params.state
    );
  }
}

module.exports = new OAuthController();
