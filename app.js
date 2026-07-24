(() => {
  "use strict";

  // ---------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------
  const composeSection = document.getElementById("compose-section");
  const viewSection = document.getElementById("view-section");
  const errorSection = document.getElementById("error-section");

  const labelInput = document.getElementById("labelInput");
  const codeInput = document.getElementById("codeInput");
  const composeMeta = document.getElementById("composeMeta");
  const issueBtn = document.getElementById("issueBtn");
  const lengthWarning = document.getElementById("lengthWarning");

  const ticketId = document.getElementById("ticketId");
  const viewLabel = document.getElementById("viewLabel");
  const codeView = document.getElementById("codeView");
  const viewMeta = document.getElementById("viewMeta");
  const selectAllBtn = document.getElementById("selectAllBtn");
  const copyCodeBtn = document.getElementById("copyCodeBtn");
  const linkField = document.getElementById("linkField");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const shareBtn = document.getElementById("shareBtn");
  const newStubLink = document.getElementById("newStubLink");

  const errorHeading = document.getElementById("errorHeading");
  const errorBody = document.getElementById("errorBody");
  const errorNewStubLink = document.getElementById("errorNewStubLink");

  const homeLink = document.getElementById("homeLink");
  const statusLive = document.getElementById("statusLive");

  const LONG_URL_WARNING_THRESHOLD = 8000;

  // ---------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------
  function announce(msg) {
    statusLive.textContent = msg;
  }

  function pluralize(n, word) {
    return `${n} ${word}${n === 1 ? "" : "s"}`;
  }

  function countLinesChars(text) {
    const lines = text.length ? text.split("\n").length : 0;
    return `${pluralize(lines, "line")} · ${pluralize(text.length, "char")}`;
  }

  function autoGrow(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, window.innerHeight * 0.6) + "px";
  }

  function bytesToBase64Url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64UrlToBytes(b64url) {
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function concatChunks(chunks) {
    let total = 0;
    for (const c of chunks) total += c.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out;
  }

  const supportsCompression =
    typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

  async function gzip(bytes) {
    const cs = new CompressionStream("gzip");
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const chunks = [];
    const reader = cs.readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return concatChunks(chunks);
  }

  async function gunzip(bytes) {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const chunks = [];
    const reader = ds.readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return concatChunks(chunks);
  }

  // Ticket number: cosmetic, deterministic hash of the payload.
  async function ticketNumberFor(str) {
    try {
      const bytes = new TextEncoder().encode(str);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return (hex.slice(0, 4) + hex.slice(4, 8)).toUpperCase();
    } catch {
      // Fallback: simple non-cryptographic hash (e.g. insecure context / file://)
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = (h * 31 + str.charCodeAt(i)) >>> 0;
      }
      return h.toString(16).padStart(8, "0").toUpperCase();
    }
  }

  // ---------------------------------------------------------
  // Encode / decode payload <-> URL hash
  // Format: "g" + base64url(gzip(json))   -- when compression supported
  //         "p" + base64url(json utf-8)   -- fallback, no compression
  // ---------------------------------------------------------
  async function encodePayload(payload) {
    const json = JSON.stringify(payload);
    if (supportsCompression) {
      const compressed = await gzip(new TextEncoder().encode(json));
      return "g" + bytesToBase64Url(compressed);
    }
    return "p" + bytesToBase64Url(new TextEncoder().encode(json));
  }

  async function decodePayload(hash) {
    const flag = hash[0];
    const body = hash.slice(1);
    const bytes = base64UrlToBytes(body);

    if (flag === "g") {
      if (!supportsCompression) {
        const err = new Error("unsupported-browser");
        throw err;
      }
      const decompressed = await gunzip(bytes);
      return JSON.parse(new TextDecoder().decode(decompressed));
    }
    if (flag === "p") {
      return JSON.parse(new TextDecoder().decode(bytes));
    }
    throw new Error("unknown-format");
  }

  // ---------------------------------------------------------
  // Copy helpers (with fallback for browsers/contexts
  // where the Clipboard API is unavailable or blocked)
  // ---------------------------------------------------------
  async function copyText(text, sourceEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fall through to legacy path
      }
    }
    if (sourceEl) {
      try {
        sourceEl.focus();
        sourceEl.select?.();
        sourceEl.setSelectionRange?.(0, text.length);
        const ok = document.execCommand("copy");
        return ok;
      } catch {
        return false;
      }
    }
    return false;
  }

  function flashButton(btn, tempLabel) {
    const original = btn.textContent;
    btn.textContent = tempLabel;
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 1400);
  }

  // ---------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------
  function showSection(section) {
    composeSection.hidden = section !== composeSection;
    viewSection.hidden = section !== viewSection;
    errorSection.hidden = section !== errorSection;
  }

  function renderCompose() {
    document.title = "stub — share a code snippet";
    showSection(composeSection);
    labelInput.value = "";
    codeInput.value = "";
    composeMeta.textContent = countLinesChars("");
    lengthWarning.hidden = true;
    codeInput.style.height = "";
    // Small delay so the section is visible before focusing (iOS quirk)
    setTimeout(() => codeInput.focus(), 50);
  }

  async function renderView(payload) {
    const code = payload.c || "";
    const label = payload.l || "";

    document.title = label ? `${label} · stub` : "stub — snippet";
    viewLabel.textContent = label;
    codeView.value = code;
    viewMeta.textContent = countLinesChars(code);
    linkField.value = window.location.href;

    const id = await ticketNumberFor(code + "|" + label);
    ticketId.textContent = id;

    showSection(viewSection);
    autoGrow(codeView);

    shareBtn.hidden = typeof navigator.share !== "function";
  }

  function renderError(kind) {
    if (kind === "unsupported-browser") {
      errorHeading.textContent = "Your browser can't open this stub.";
      errorBody.textContent = "This link needs a newer browser to decompress the snippet. Try updating, or open it in Chrome, Safari, or Firefox.";
    } else {
      errorHeading.textContent = "This stub is torn.";
      errorBody.textContent = "The link is missing part of its code — ask for a fresh one.";
    }
    showSection(errorSection);
  }

  // ---------------------------------------------------------
  // Routing: hash is the only "backend" there is
  // ---------------------------------------------------------
  async function handleRoute() {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) {
      renderCompose();
      return;
    }
    try {
      const payload = await decodePayload(raw);
      if (typeof payload.c !== "string") throw new Error("bad-payload");
      await renderView(payload);
    } catch (err) {
      renderError(err && err.message === "unsupported-browser" ? "unsupported-browser" : "torn");
    }
  }

  function goHome(e) {
    if (e) e.preventDefault();
    history.pushState("", document.title, window.location.pathname + window.location.search);
    renderCompose();
  }

  // ---------------------------------------------------------
  // Compose interactions
  // ---------------------------------------------------------
  codeInput.addEventListener("input", () => {
    composeMeta.textContent = countLinesChars(codeInput.value);
    autoGrow(codeInput);
  });

  issueBtn.addEventListener("click", async () => {
    const code = codeInput.value;
    if (!code.trim()) {
      codeInput.focus();
      return;
    }
    const label = labelInput.value.trim();

    issueBtn.disabled = true;
    issueBtn.textContent = "Issuing…";

    try {
      const payload = { c: code };
      if (label) payload.l = label;
      const encoded = await encodePayload(payload);

      const prospectiveUrl = `${window.location.origin}${window.location.pathname}#${encoded}`;
      if (prospectiveUrl.length > LONG_URL_WARNING_THRESHOLD) {
        lengthWarning.hidden = false;
        lengthWarning.textContent = `Heads up — this is a big snippet, so the link is long (~${prospectiveUrl.length.toLocaleString()} characters) and may get truncated in some chat apps or SMS.`;
      } else {
        lengthWarning.hidden = true;
      }

      window.location.hash = encoded;
    } finally {
      issueBtn.disabled = false;
      issueBtn.textContent = "Issue stub";
    }
  });

  // ---------------------------------------------------------
  // View interactions
  // ---------------------------------------------------------
  selectAllBtn.addEventListener("click", () => {
    codeView.focus();
    codeView.setSelectionRange(0, codeView.value.length);
  });

  copyCodeBtn.addEventListener("click", async () => {
    const ok = await copyText(codeView.value, codeView);
    flashButton(copyCodeBtn, ok ? "Copied ✓" : "Couldn't copy");
    announce(ok ? "Code copied to clipboard" : "Copy failed");
  });

  copyLinkBtn.addEventListener("click", async () => {
    const ok = await copyText(linkField.value, linkField);
    flashButton(copyLinkBtn, ok ? "Copied ✓" : "Failed");
    announce(ok ? "Link copied to clipboard" : "Copy failed");
  });

  shareBtn.addEventListener("click", async () => {
    try {
      await navigator.share({ url: linkField.value, title: viewLabel.textContent || "Code stub" });
    } catch {
      /* user cancelled share sheet — no-op */
    }
  });

  linkField.addEventListener("focus", () => linkField.select());

  newStubLink.addEventListener("click", goHome);
  errorNewStubLink.addEventListener("click", goHome);
  homeLink.addEventListener("click", goHome);

  // ---------------------------------------------------------
  // Boot
  // ---------------------------------------------------------
  window.addEventListener("hashchange", handleRoute);
  document.addEventListener("DOMContentLoaded", handleRoute);
})();
