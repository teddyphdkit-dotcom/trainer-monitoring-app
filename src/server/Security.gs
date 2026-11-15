/**
 * Security.gs — Kriptografi PBKDF2-HMAC-SHA256, token HMAC, constant-time compare, & validasi password.
 */

var TM_Security = (function () {
  // Pure-JS SHA-256 (V8 & Node deterministic, tanpa overhead bridge 10.000x ke Java)
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function utf8ToBytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0xd800 || code >= 0xe000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        i++;
        var code2 = str.charCodeAt(i);
        var cp = 0x10000 + (((code & 0x3ff) << 10) | (code2 & 0x3ff));
        bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f)
        );
      }
    }
    return bytes;
  }

  function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      hex += ('0' + (bytes[i] & 0xff).toString(16)).slice(-2);
    }
    return hex;
  }

  function hexToBytes(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  function sha256Bytes(msgBytes) {
    var H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    var m = msgBytes.slice();
    var bitLen = m.length * 8;
    m.push(0x80);
    while ((m.length % 64) !== 56) {
      m.push(0);
    }
    var hi = Math.floor(bitLen / 0x100000000);
    var lo = bitLen >>> 0;
    m.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
    m.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

    var w = new Array(64);
    for (var offset = 0; offset < m.length; offset += 64) {
      for (var t = 0; t < 16; t++) {
        var j = offset + t * 4;
        w[t] = ((m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3]) | 0;
      }
      for (var t2 = 16; t2 < 64; t2++) {
        var s0 = ((w[t2 - 15] >>> 7) | (w[t2 - 15] << 25)) ^ ((w[t2 - 15] >>> 18) | (w[t2 - 15] << 14)) ^ (w[t2 - 15] >>> 3);
        var s1 = ((w[t2 - 2] >>> 17) | (w[t2 - 2] << 15)) ^ ((w[t2 - 2] >>> 19) | (w[t2 - 2] << 13)) ^ (w[t2 - 2] >>> 10);
        w[t2] = (w[t2 - 16] + s0 + w[t2 - 7] + s1) | 0;
      }

      var a = H[0], b = H[1], c = H[2], d = H[3];
      var e = H[4], f = H[5], g = H[6], h = H[7];

      for (var i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ ((~e) & g);
        var temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (S0 + maj) | 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) | 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) | 0;
      }

      H[0] = (H[0] + a) | 0;
      H[1] = (H[1] + b) | 0;
      H[2] = (H[2] + c) | 0;
      H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0;
      H[5] = (H[5] + f) | 0;
      H[6] = (H[6] + g) | 0;
      H[7] = (H[7] + h) | 0;
    }

    var out = [];
    for (var idx = 0; idx < 8; idx++) {
      out.push((H[idx] >>> 24) & 0xff, (H[idx] >>> 16) & 0xff, (H[idx] >>> 8) & 0xff, H[idx] & 0xff);
    }
    return out;
  }

  function sha256Hex(str) {
    return bytesToHex(sha256Bytes(utf8ToBytes(String(str))));
  }

  function hmacSha256Bytes(keyBytes, msgBytes) {
    var key = keyBytes.length > 64 ? sha256Bytes(keyBytes) : keyBytes.slice();
    while (key.length < 64) key.push(0);
    var oKeyPad = new Array(64);
    var iKeyPad = new Array(64);
    for (var i = 0; i < 64; i++) {
      oKeyPad[i] = key[i] ^ 0x5c;
      iKeyPad[i] = key[i] ^ 0x36;
    }
    var inner = sha256Bytes(iKeyPad.concat(msgBytes));
    return sha256Bytes(oKeyPad.concat(inner));
  }

  function hmacSha256Hex(secretStr, msgStr) {
    return bytesToHex(hmacSha256Bytes(utf8ToBytes(String(secretStr)), utf8ToBytes(String(msgStr))));
  }

  function pbkdf2Sha256Hex(password, saltBytes, iterations) {
    var pwdBytes = utf8ToBytes(String(password));
    var block1 = saltBytes.concat([0, 0, 0, 1]);
    var u = hmacSha256Bytes(pwdBytes, block1);
    var t = u.slice();
    for (var i = 1; i < iterations; i++) {
      u = hmacSha256Bytes(pwdBytes, u);
      for (var j = 0; j < 32; j++) {
        t[j] ^= u[j];
      }
    }
    return bytesToHex(t);
  }

  function randomHex(byteCount) {
    var out = [];
    while (out.length < byteCount * 2) {
      var seed = (
        (typeof Utilities !== 'undefined' && Utilities.getUuid ? Utilities.getUuid() : '') +
        ':' + Date.now() + ':' + Math.random() + ':' + Math.random()
      );
      out.push(sha256Hex(seed));
    }
    return out.join('').slice(0, byteCount * 2);
  }

  function constantTimeEquals(a, b) {
    var s1 = String(a || '');
    var s2 = String(b || '');
    var diff = s1.length ^ s2.length;
    var maxLen = Math.max(s1.length, s2.length);
    for (var i = 0; i < maxLen; i++) {
      var c1 = i < s1.length ? s1.charCodeAt(i) : 0;
      var c2 = i < s2.length ? s2.charCodeAt(i) : 0;
      diff |= (c1 ^ c2);
    }
    return diff === 0;
  }

  function hashPassword(password) {
    var iterations = TM_CONFIG.AUTH.PBKDF2_ITERATIONS;
    var saltHex = randomHex(16);
    var derivedHex = pbkdf2Sha256Hex(password, hexToBytes(saltHex), iterations);
    return 'pbkdf2$' + iterations + '$' + saltHex + '$' + derivedHex;
  }

  function verifyPassword(password, storedHash) {
    if (!password || !storedHash) return false;
    var parts = String(storedHash).split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    var iterations = parseInt(parts[1], 10);
    var saltHex = parts[2];
    var expectedHex = parts[3];
    if (!iterations || iterations < 1000 || !saltHex || !expectedHex) return false;
    var actualHex = pbkdf2Sha256Hex(password, hexToBytes(saltHex), iterations);
    return constantTimeEquals(actualHex, expectedHex);
  }

  function validatePasswordStrength(password) {
    var p = String(password || '');
    if (p.length < TM_CONFIG.AUTH.MIN_PASSWORD_LENGTH) {
      return 'Password minimal ' + TM_CONFIG.AUTH.MIN_PASSWORD_LENGTH + ' karakter.';
    }
    if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
      return 'Password harus mengandung kombinasi huruf dan angka.';
    }
    return null;
  }

  var B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function bytesToBase64Url(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var b1 = bytes[i] & 0xff;
      var hasB2 = (i + 1) < bytes.length;
      var hasB3 = (i + 2) < bytes.length;
      var b2 = hasB2 ? (bytes[i + 1] & 0xff) : 0;
      var b3 = hasB3 ? (bytes[i + 2] & 0xff) : 0;
      var triplet = (b1 << 16) | (b2 << 8) | b3;
      out += B64_CHARS.charAt((triplet >> 18) & 0x3f);
      out += B64_CHARS.charAt((triplet >> 12) & 0x3f);
      if (hasB2) out += B64_CHARS.charAt((triplet >> 6) & 0x3f);
      if (hasB3) out += B64_CHARS.charAt(triplet & 0x3f);
    }
    return out.replace(/\+/g, '-').replace(/\//g, '_');
  }

  function base64UrlToBytes(b64u) {
    var s = String(b64u || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4 !== 0) s += '=';
    var out = [];
    for (var i = 0; i < s.length; i += 4) {
      var c1 = B64_CHARS.indexOf(s.charAt(i));
      var c2 = B64_CHARS.indexOf(s.charAt(i + 1));
      var c3 = s.charAt(i + 2) === '=' ? -1 : B64_CHARS.indexOf(s.charAt(i + 2));
      var c4 = s.charAt(i + 3) === '=' ? -1 : B64_CHARS.indexOf(s.charAt(i + 3));
      if (c1 < 0 || c2 < 0) break;
      var triplet = (c1 << 18) | (c2 << 12) | ((c3 > 0 ? c3 : 0) << 6) | (c4 > 0 ? c4 : 0);
      out.push((triplet >> 16) & 0xff);
      if (c3 >= 0) out.push((triplet >> 8) & 0xff);
      if (c4 >= 0) out.push(triplet & 0xff);
    }
    return out;
  }

  function bytesToUtf8(bytes) {
    var str = '';
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i] & 0xff;
      if (b < 0x80) {
        str += String.fromCharCode(b);
      } else if ((b & 0xe0) === 0xc0 && (i + 1) < bytes.length) {
        str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
      } else if ((b & 0xf0) === 0xe0 && (i + 2) < bytes.length) {
        var b2 = bytes[++i] & 0x3f;
        var b3 = bytes[++i] & 0x3f;
        str += String.fromCharCode(((b & 0x0f) << 12) | (b2 << 6) | b3);
      } else if ((b & 0xf8) === 0xf0 && (i + 3) < bytes.length) {
        var cp = ((b & 0x07) << 18) | ((bytes[++i] & 0x3f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f);
        cp -= 0x10000;
        str += String.fromCharCode(0xd800 + ((cp >> 10) & 0x3ff), 0xdc00 + (cp & 0x3ff));
      }
    }
    return str;
  }

  function base64UrlJson(obj) {
    return bytesToBase64Url(utf8ToBytes(JSON.stringify(obj)));
  }

  function parseBase64UrlJson(b64u) {
    try {
      var raw = bytesToUtf8(base64UrlToBytes(b64u));
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function readBearerToken(value) {
    if (!value || typeof value !== 'string') return '';
    var trimmed = value.trim();
    var m = /^Bearer\s+([^\s]+)$/i.exec(trimmed);
    return m ? m[1] : trimmed;
  }

  function getHmacSecret() {
    var secret = TM_Db.getProps().getProperty(TM_CONFIG.PROP_KEYS.HMAC_SECRET);
    if (!secret) {
      throw TM_Utils.AppError('ERR_NOT_INITIALIZED', 'Kunci keamanan aplikasi belum diinisialisasi.');
    }
    return secret;
  }

  /**
   * Membuat token sesi mengikuti pola Orca (apns-authentication-token.ts & relay-token-verifier.ts):
   * base64Url(header).base64Url(payload).hmacSignature
   */
  function signSessionToken(authSessionId, claimsInput) {
    var opts = claimsInput || {};
    var nowMs = TM_Utils.now().getTime();
    var iatSec = Math.floor(nowMs / 1000);
    var expSec = opts.exp || (iatSec + (TM_CONFIG.AUTH.SESSION_MAX_HOURS * 3600));
    var header = base64UrlJson({ alg: 'HS256', typ: 'TM-AUTH', v: 1 });
    var payload = base64UrlJson({
      sid: String(authSessionId),
      sub: String(opts.userId || authSessionId),
      role: String(opts.role || ''),
      purpose: 'session-auth',
      iat: iatSec,
      exp: expSec
    });
    var signingInput = header + '.' + payload;
    var sig = hmacSha256Hex(getHmacSecret(), 'SESSION_V2:' + signingInput);
    return signingInput + '.' + sig;
  }

  function verifySessionTokenClaims(rawToken) {
    var token = readBearerToken(rawToken);
    if (!token) return null;
    var parts = token.split('.');

    // Pola V2 (Orca 3-part: header.payload.signature)
    if (parts.length === 3) {
      var signingInput = parts[0] + '.' + parts[1];
      var providedSig = parts[2];
      if (!parts[0] || !parts[1] || !providedSig) return null;
      var expectedSig = hmacSha256Hex(getHmacSecret(), 'SESSION_V2:' + signingInput);
      if (!constantTimeEquals(providedSig, expectedSig)) return null;
      var claims = parseBase64UrlJson(parts[1]);
      if (!claims || !claims.sid || claims.purpose !== 'session-auth') return null;
      return claims;
    }

    // Kompatibilitas balik V1 (2-part: sessionId.signature)
    if (parts.length === 2) {
      var authSessionId = parts[0];
      var sigV1 = parts[1];
      if (!authSessionId || !sigV1) return null;
      var expectedV1 = hmacSha256Hex(getHmacSecret(), 'SESSION:' + authSessionId);
      if (!constantTimeEquals(sigV1, expectedV1)) return null;
      return {
        sid: authSessionId,
        sub: authSessionId,
        role: '',
        purpose: 'session-auth'
      };
    }

    return null;
  }

  function verifySessionToken(rawToken) {
    var claims = verifySessionTokenClaims(rawToken);
    return claims ? claims.sid : null;
  }

  return {
    sha256Hex: sha256Hex,
    hmacSha256Hex: hmacSha256Hex,
    randomHex: randomHex,
    constantTimeEquals: constantTimeEquals,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword,
    validatePasswordStrength: validatePasswordStrength,
    base64UrlJson: base64UrlJson,
    parseBase64UrlJson: parseBase64UrlJson,
    readBearerToken: readBearerToken,
    signSessionToken: signSessionToken,
    verifySessionTokenClaims: verifySessionTokenClaims,
    verifySessionToken: verifySessionToken
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TM_Security: TM_Security };
}
