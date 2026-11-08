import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPx1vLo5LqCVm18oAkwT9LWQ1hrdmYxYE",
  authDomain: "codeshare-sh.firebaseapp.com",
  databaseURL:
    "https://codeshare-sh-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "codeshare-sh",
  storageBucket: "codeshare-sh.firebasestorage.app",
  messagingSenderId: "72808844048",
  appId: "1:72808844048:web:cb95960c9f814df07a3395",
};

// 1. Room ID
let roomId = window.location.hash.substring(1);
if (!roomId) {
  roomId = Math.random().toString(36).substring(2, 8);
  window.location.hash = roomId;
}

// 2. Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const roomRef = ref(db, "pads/" + roomId);
const connectedRef = ref(db, ".info/connected");

// 3. DOM references
const editor = document.getElementById("code-editor");
const editorShell = document.getElementById("editor-shell");
const statusEl = document.getElementById("status");
const statusLabel = statusEl.querySelector(".status-label");
const roomIdEl = document.getElementById("room-id");
const btnRoom = document.getElementById("btn-room");
const btnCutCode = document.getElementById("btn-cut-code");
const btnPasteCode = document.getElementById("btn-paste-code");
const btnCopyCode = document.getElementById("btn-copy-code");
const btnCopyLink = document.getElementById("btn-copy-link");
const charCountEl = document.getElementById("char-count");
const lineCountEl = document.getElementById("line-count");

roomIdEl.textContent = roomId;

// 4. Real connection status (reflects the actual socket, not just data arrival)
let hasConnectedBefore = false;
onValue(connectedRef, (snapshot) => {
  const isConnected = snapshot.val() === true;
  if (isConnected) {
    statusEl.classList.remove("status--connecting");
    statusEl.classList.add("status--live");
    statusLabel.textContent = "Live";
    hasConnectedBefore = true;
  } else {
    statusEl.classList.remove("status--live");
    statusEl.classList.add("status--connecting");
    statusLabel.textContent = hasConnectedBefore ? "Reconnecting…" : "Connecting…";
  }
});

// 5. Listen for changes from Firebase
onValue(roomRef, (snapshot) => {
  const data = snapshot.val() || "";

  // Only update if text is different, to prevent cursor jumping while typing
  if (editor.value !== data) {
    const cursor = editor.selectionStart;
    editor.value = data;
    // Restore cursor position
    editor.selectionStart = cursor;
    editor.selectionEnd = cursor;

    // Briefly light up the panel border so an incoming remote edit is visible
    editorShell.classList.remove("is-syncing");
    void editorShell.offsetWidth; // restart the animation
    editorShell.classList.add("is-syncing");
  }

  updateMeta();
});

// 6. Send local changes to Firebase
editor.addEventListener("input", () => {
  set(roomRef, editor.value);
  updateMeta();
});

function updateMeta() {
  const value = editor.value;
  const chars = value.length;
  const lines = value === "" ? 1 : value.split("\n").length;
  charCountEl.textContent = `${chars} char${chars === 1 ? "" : "s"}`;
  lineCountEl.textContent = `${lines} line${lines === 1 ? "" : "s"}`;
}

// 7. Button success feedback (swaps in a checkmark, then restores)
const flashTimers = new WeakMap();
function flashButton(button, message) {
  if (flashTimers.has(button)) {
    clearTimeout(flashTimers.get(button));
  } else {
    button.dataset.originalHtml = button.innerHTML;
  }
  button.innerHTML =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 8 14.5 16 5.5"/></svg><span>' +
    message +
    "</span>";
  const timer = setTimeout(() => {
    button.innerHTML = button.dataset.originalHtml;
    delete button.dataset.originalHtml;
    flashTimers.delete(button);
  }, 1600);
  flashTimers.set(button, timer);
}

async function copyRoomLink() {
  await navigator.clipboard.writeText(window.location.href);
}

// 7b. Gemini "Ask AI" — sends the current text as a prompt, replaces it with the reply
const GEMINI_KEY_STORAGE = "codeshare_gemini_key";
const GEMINI_MODEL = "gemini-3.6-flash";

const btnApiKey = document.getElementById("btn-api-key");
const btnAskAI = document.getElementById("btn-ask-ai");
const askAILabel = btnAskAI.querySelector("span");
const keyModal = document.getElementById("key-modal");
const apiKeyInput = document.getElementById("api-key-input");
const btnKeySave = document.getElementById("btn-key-save");
const btnKeyCancel = document.getElementById("btn-key-cancel");

function getStoredKey() {
  return localStorage.getItem(GEMINI_KEY_STORAGE) || "";
}

function openKeyModal() {
  apiKeyInput.value = getStoredKey();
  keyModal.hidden = false;
  apiKeyInput.focus();
}

function closeKeyModal() {
  keyModal.hidden = true;
}

btnApiKey.addEventListener("click", openKeyModal);
btnKeyCancel.addEventListener("click", closeKeyModal);

btnKeySave.addEventListener("click", () => {
  const value = apiKeyInput.value.trim();
  if (value) {
    localStorage.setItem(GEMINI_KEY_STORAGE, value);
  } else {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
  }
  closeKeyModal();
});

keyModal.addEventListener("click", (event) => {
  if (event.target === keyModal) closeKeyModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !keyModal.hidden) closeKeyModal();
});

function setAskAILoading(isLoading) {
  btnAskAI.disabled = isLoading;
  btnAskAI.classList.toggle("is-loading", isLoading);
  askAILabel.textContent = isLoading ? "Thinking…" : "Ask AI";
}

async function askAI() {
  const prompt = editor.value.trim();
  if (!prompt) {
    alert("Type a prompt in the box first.");
    return;
  }

  const apiKey = getStoredKey();
  if (!apiKey) {
    openKeyModal();
    return;
  }

  setAskAILoading(true);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = errorBody?.error?.message || `Request failed (${response.status})`;
      throw new Error(message);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();

    if (reply) {
      editor.value = reply;
      set(roomRef, reply);
      updateMeta();

      editorShell.classList.remove("is-syncing");
      void editorShell.offsetWidth;
      editorShell.classList.add("is-syncing");
    }
  } catch (err) {
    const lower = String(err.message || "").toLowerCase();
    if (lower.includes("api key not valid") || lower.includes("invalid") || lower.includes("permission_denied")) {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
    alert(`Gemini request failed: ${err.message}`);
  } finally {
    setAskAILoading(false);
  }
}

btnAskAI.addEventListener("click", askAI);

// 8. Mobile / action buttons
btnCopyCode.addEventListener("click", async () => {
  if (!editor.value) return;
  await navigator.clipboard.writeText(editor.value);
  flashButton(btnCopyCode, "Copied!");
});

btnCopyLink.addEventListener("click", async () => {
  await copyRoomLink();
  flashButton(btnCopyLink, "Link copied!");
});

btnRoom.addEventListener("click", async () => {
  await copyRoomLink();
  const original = roomIdEl.textContent;
  roomIdEl.textContent = "copied!";
  setTimeout(() => (roomIdEl.textContent = original), 1400);
});

btnCutCode.addEventListener("click", async () => {
  if (!editor.value) return;

  await navigator.clipboard.writeText(editor.value);
  editor.value = "";
  set(roomRef, "");
  updateMeta();

  flashButton(btnCutCode, "Cut!");
});

// Paste Code
btnPasteCode.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    editor.value = text;
    set(roomRef, text);
    updateMeta();

    flashButton(btnPasteCode, "Pasted!");
  } catch (err) {
    alert("Clipboard access denied.");
  }
});

const placeholders = [
  "Type here. Anyone with the link will see this live...",
  "There are only 10 types of people...",
  "It works on my machine.",
  "I don't always test my code... I do it in production.",
  "A SQL query walks into a bar and asks, 'Can I join you?'",
  "Debugging is like being the detective in a crime movie where you're also the murderer.",
  "My code doesn't have bugs. It develops random features.",
  "Ctrl + S is your best friend.",
  "One does not simply center a div.",
  "Java developers wear glasses because they don't C#.",
  "There is no place like 127.0.0.1.",
  "404: Motivation not found.",
  "Commit early. Commit often.",
  "Git happens.",
  "Programming is 10% coding and 90% Googling.",
  "I came. I saw. I console.logged.",
  "Semicolons save lives.",
  "Keep calm and clear the cache.",
  "Delete production? Y/N",
  "TODO: Fix this later.",
  "Works perfectly... don't touch it.",
  "Keyboard not found. Press F1 to continue.",
  "Hello, World!",
  "Have you tried turning it off and on again?",
  "Code never lies. Comments sometimes do.",
  "Sleep is just a power-saving mode.",
  "My favorite language is coffee.",
  "You had one job... compiler.",
  "Trust me, I'm a programmer.",
  "The bug is hiding in line 437.",
  "This code was written at 2 AM.",
  "Stack Overflow is open in another tab.",
  "Feature or bug? Yes.",
  "Keep your commits atomic.",
  "If it compiles, ship it.",
  "Welcome to the infinite loop.",
  "Don't panic. It's just JavaScript.",
  "npm install fixes everything... until it doesn't.",
  "CSS is harder than quantum physics.",
  "AI wrote this. Maybe.",
  "Write code. Break code. Repeat.",
  "No semicolons were harmed here.",
  "Clean code > Clever code.",
  "Why is this null?",
  "This textarea is bug-free... probably.",
  "Paste your masterpiece here.",
  "Coding is cheaper than therapy.",
  "May the source be with you.",
  "Hack. Build. Share.",
  "Start typing... magic happens.",
];

editor.placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

// 9. Ambient "live" background particles — small packets drifting up
const particleContainer = document.getElementById("bg-particles");
const PARTICLE_COUNT = 16;

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const particle = document.createElement("span");
  particle.className = "bg-particle";

  const size = 3 + Math.random() * 5;
  const left = Math.random() * 100;
  const duration = 14 + Math.random() * 14;
  const delay = Math.random() * -28;
  const drift = (Math.random() * 60 - 30).toFixed(0) + "px";
  const color = Math.random() > 0.5 ? "var(--signal)" : "var(--pulse)";

  particle.style.cssText = `
    left: ${left}%;
    width: ${size}px;
    height: ${size}px;
    background: ${color};
    animation-duration: ${duration}s;
    animation-delay: ${delay}s;
    --drift: ${drift};
  `;

  particleContainer.appendChild(particle);
}