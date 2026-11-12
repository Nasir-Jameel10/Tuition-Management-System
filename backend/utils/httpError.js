// Error with an HTTP status that is safe to show to the client.
class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.extra = extra;
  }
}

module.exports = HttpError;
