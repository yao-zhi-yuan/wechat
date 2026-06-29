function ok(data = {}) {
  return { ok: true, data };
}

function fail(code, message) {
  return { ok: false, error: { code, message } };
}

module.exports = { ok, fail };
