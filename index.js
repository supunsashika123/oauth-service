const express = require("express");
const bodyParser = require("body-parser");
const OAuthServer = require("oauth2-server");

const Request = OAuthServer.Request;
const Response = OAuthServer.Response;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// This is a simplified model without persistent storage.
const memoryModel = {
  clients: [
    {
      clientId: "test",
      clientSecret: "test",
      grants: ["password"],
    },
  ],
  getAccessToken: (accessToken) => {
    const token = {
      accessToken: accessToken, // Will need validation in a real scenario
      accessTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in the future
      client: { id: "test" },
      clientId: "test",
      user: { id: "user123" },
    };

    return Promise.resolve(token);
  },
  getClient: (clientId, clientSecret, callback) => {
    const client = memoryModel.clients.find(
      (client) =>
        client.clientId === clientId && client.clientSecret === clientSecret
    );
    if (client) {
      callback(null, client);
    } else {
      callback(true, null);
    }
  },
  saveToken: (token, client, user) => {
    const accessToken = {
      accessToken: "someRandomToken" + Math.random(),
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      client: client,
      clientId: client.clientId,
      user: user,
      userId: user.id,
    };

    return accessToken;
  },
  getUser: (username, password, callback) => {
    // Since this is a mock, directly validate the provided username and password
    if (username === "test" && password === "test") {
      callback(null, { id: "user123", username: "test" });
    } else {
      callback(true, null);
    }
  },
};

app.oauth = new OAuthServer({
  model: memoryModel,
  accessTokenLifetime: 60 * 60, // 1 hour
  allowBearerTokensInQueryString: true,
});

app.post("/auth", (req, res, next) => {
  const request = new Request(req);
  const response = new Response(res);

  app.oauth
    .token(request, response)
    .then((token) => {
      res.json(token);
    })
    .catch((err) => {
      res.status(err.code || 500).json(err);
    });
});

app.get("/secure", (req, res) => {
  let request = new Request(req);
  let response = new Response(res);

  app.oauth
    .authenticate(request, response)
    .then((token) => {
      res.json({ message: "OAuth verified. Sending secure data" });
    })
    .catch((err) => {
      res.status(err.code || 500).json(err);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OAuth Server is running on http://localhost:${PORT}`);
});
