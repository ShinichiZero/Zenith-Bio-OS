# SECURITY.md — Zenith Bio-OS

> Version: 2026.1 | Classification: Public

---

## Table of Contents

1. [Threat Model](#1-threat-model)
2. [Mitigation Strategies](#2-mitigation-strategies)
3. [Privacy-First Disclosure (GDPR/HIPAA)](#3-privacy-first-disclosure-gdprhipaa)
4. [Vulnerability Reporting](#4-vulnerability-reporting)

---

## 1. Threat Model

Zenith Bio-OS processes sensitive health data (body composition, metabolic markers) entirely in the browser. The following threat categories are addressed:

### 1.1 Spoofing & Identity Threats

| Threat | Surface | Impact |
|---|---|---|
| Session hijacking | localStorage / cookies | Attacker reads encrypted blobs (cannot decrypt without origin-bound key) |
| Malicious script injection | Input fields | Injected script could exfiltrate rendered DOM data |
| Supply-chain attack | Third-party CDN | Unauthorised script execution |

### 1.2 XSS (Cross-Site Scripting)

Manual input fields are the primary XSS vector. An attacker who can control a field value could attempt to inject `<script>` tags or event-handler attributes that execute in the DOM.

### 1.3 Data Leakage

| Threat | Surface | Impact |
|---|---|---|
| Plaintext storage | localStorage | Anyone with physical or XSS access reads raw health data |
| Network exfiltration | `fetch` / `XMLHttpRequest` | Biometric data sent to attacker-controlled server |
| DevTools inspection | Runtime memory | Attacker reads or modifies live health variables |

### 1.4 Tampering / Integrity Threats

An attacker with DevTools open could modify JavaScript variables (e.g., body fat percentage) in real-time and capture false analysis results.

---

## 2. Mitigation Strategies

### 2.1 Data Locality — Client-Side Processing Only

All biometric calculations are performed in `BioEngine.ts`, a pure TypeScript module with **zero external API calls**. The Content Security Policy `connect-src 'none'` directive blocks all outbound XHR/fetch connections at the browser level.

```
Content-Security-Policy:
  default-src 'self';
  script-src  'self' 'unsafe-inline';
  style-src   'self' 'unsafe-inline';
  img-src     'self' data:;
  connect-src 'none';       ← blocks all network calls
  object-src  'none';
  base-uri    'self';
  form-action 'self';
```

### 2.2 Encryption-at-Rest (AES-GCM 256-bit)

Implemented in `SecurityController.ts`:

```
Mechanism:   Web Crypto API — AES-GCM (256-bit key)
Key storage: JWK format in localStorage, origin-scoped
IV:          12-byte random, unique per encryption call
Format:      Base64(IV) : Base64(Ciphertext)
```

- **Key generation:** `crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt','decrypt'])`
- **Key persistence:** Exported as JWK and stored at `zenith_enc_key`. Never leaves the browser origin.
- **Ciphertext:** Stored at `zenith_bio_data`. Meaningless without the co-located key.
- **Key rotation:** Deleting `zenith_enc_key` from localStorage triggers automatic regeneration (existing data becomes inaccessible, protecting user privacy on shared devices).

### 2.3 Input Sanitisation (DOMPurify)

All user-supplied strings pass through `DOMPurify.sanitize()` before numeric parsing:

```typescript
// SecurityController.ts
export function sanitizeInput(raw: string): string {
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}
```

Configuration `{ ALLOWED_TAGS: [], ALLOWED_ATTR: [] }` strips **all** HTML, including event handlers, `<script>`, SVG, and MathML payloads. Only plain text survives.

### 2.4 Anti-Tampering (DevTools Detection)

`SecurityController.ts` implements two complementary heuristics:

| Mechanism | Description |
|---|---|
| **Resize listener** | Detects a `>160 px` discrepancy between `outerWidth`/`outerHeight` and `innerWidth`/`innerHeight` — a signature of DevTools docked to the viewport edge |
| **Debugger trap** | A `debugger` statement inside a `setTimeout` loop (production builds only) pauses execution in any active DevTools session, disrupting live variable inspection |

On detection, `zenith_bio_data` is wiped from localStorage, invalidating the session.

> **Note:** These are deterrents, not hard security guarantees. A determined attacker with source access can bypass them. They are designed to protect casual manipulation and automated scraping of health variables.

### 2.5 Content Security Policy (CSP)

Declared via `<meta http-equiv="Content-Security-Policy">` in `index.html`:

- **`default-src 'self'`** — restricts all resource types to the same origin by default.
- **`connect-src 'none'`** — prevents any XHR, fetch, WebSocket, or EventSource call.
- **`object-src 'none'`** — blocks Flash and other plugin content.
- **`base-uri 'self'`** — prevents base-tag hijacking that could redirect relative URLs.

---

## 3. Privacy-First Disclosure (GDPR/HIPAA)

### 3.1 Design Principles

| Principle | Implementation |
|---|---|
| **Data Minimisation** | Only user-provided biometric values are stored; no identifiers, no telemetry |
| **Purpose Limitation** | Data is used solely for local body composition analysis |
| **Storage Limitation** | Users can clear data by clearing browser storage; no server-side copy exists |
| **Integrity & Confidentiality** | AES-GCM encryption at rest; CSP blocks exfiltration at transport level |
| **Privacy by Design** | All processing occurs on-device; the application has no backend |

### 3.2 GDPR Alignment

- **Article 25 (Data Protection by Design):** No biometric data ever leaves the browser; the `connect-src 'none'` CSP makes network transmission technically impossible during normal operation.
- **Article 5(1)(e) (Storage Limitation):** Data persists only in the user's own browser storage; the user retains full control and can delete it at any time via browser settings.
- **Article 32 (Security):** AES-GCM 256-bit encryption satisfies the "appropriate technical measures" requirement for data at rest.

### 3.3 HIPAA Alignment

- **§164.312(a)(2)(iv) — Encryption/Decryption:** PHI-equivalent data (body composition metrics) is encrypted at rest using NIST-approved AES-GCM.
- **§164.312(c)(1) — Integrity Controls:** The AES-GCM authentication tag detects any tampering with stored ciphertext; corrupted data is discarded on load.
- **§164.312(e)(1) — Transmission Security:** No transmission occurs; `connect-src 'none'` CSP ensures technical enforcement.

### 3.4 Disclaimer

Zenith Bio-OS is a personal wellness tool. It is **not** a certified medical device, is not intended to diagnose, treat, or prevent any medical condition, and does not constitute medical advice. Consult a qualified healthcare professional before making health decisions.

---

## 4. Vulnerability Reporting

If you discover a security vulnerability in Zenith Bio-OS, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Submit a private security advisory via **GitHub → Security → Advisories → New draft advisory**.
3. Include: description, reproduction steps, impact assessment, and suggested mitigation.
4. Expect acknowledgement within **72 hours** and a patch within **14 days** for confirmed critical issues.

---

*This document was generated as part of the Zenith Bio-OS 2026 Development Suite.*
