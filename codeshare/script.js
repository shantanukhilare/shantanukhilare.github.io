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
// 1. Initialize Room ID
let roomId = window.location.hash.substring(1);
if (!roomId) {
  // Generate a random 6-character room ID if none exists
  roomId = Math.random().toString(36).substring(2, 8);
  window.location.hash = roomId;
}

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const roomRef = ref(db, "pads/" + roomId);

const editor = document.getElementById("code-editor");
const status = document.getElementById("status");
const btnCopyCode = document.getElementById("btn-copy-code");
const btnCopyLink = document.getElementById("btn-copy-link");

// 3. Listen for changes from Firebase
onValue(roomRef, (snapshot) => {
  status.textContent = "Live 🟢";
  const data = snapshot.val() || "";

  // Only update if text is different, to prevent cursor jumping while typing
  if (editor.value !== data) {
    const cursor = editor.selectionStart;
    editor.value = data;
    // Restore cursor position
    editor.selectionStart = cursor;
    editor.selectionEnd = cursor;
  }
});

// 4. Send local changes to Firebase
editor.addEventListener("input", () => {
  set(roomRef, editor.value);
});

// 5. Mobile Buttons
btnCopyCode.addEventListener("click", async () => {
  if (!editor.value) return;
  await navigator.clipboard.writeText(editor.value);
  const originalText = btnCopyCode.textContent;
  btnCopyCode.textContent = "Copied!";
  setTimeout(() => (btnCopyCode.textContent = originalText), 2000);
});

btnCopyLink.addEventListener("click", async () => {
  await navigator.clipboard.writeText(window.location.href);
  const originalText = btnCopyLink.textContent;
  btnCopyLink.textContent = "Link Copied!";
  setTimeout(() => (btnCopyLink.textContent = originalText), 2000);
});
