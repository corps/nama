export class WebServerConfig {
  port = 8080;
  isProduction = false;
  storeSessions = false;
  useCache = false;
  secret = "avaluehere";
  sessionTtlSecs = 60 * 60 * 24 * 30;
  evernoteConfig = new OAuthConfig();
  behindProxy = false;
  databaseName = ":memory:";
  https = false;
}

export class OAuthConfig {
  consumerKey = "";
  consumerSecret = "";
}