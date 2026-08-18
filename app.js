import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const elements = {
  welcome: document.querySelector("#welcome"),
  dashboard: document.querySelector("#dashboard"),
  loginTab: document.querySelector("#loginTab"),
  signupTab: document.querySelector("#signupTab"),
  loginForm: document.querySelector("#loginForm"),
  signupForm: document.querySelector("#signupForm"),
  authMessage: document.querySelector("#authMessage"),
  userEmail: document.querySelector("#userEmail"),
  logoutButton: document.querySelector("#logoutButton"),
  exportButton: document.querySelector("#exportButton"),
  applicationForm: document.querySelector("#applicationForm"),
  applicationMessage: document.querySelector("#applicationMessage"),
  saveButton: document.querySelector("#saveButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  editorTitle: document.querySelector("#editorTitle"),
  search: document.querySelector("#search"),
  filter: document.querySelector("#filter"),
  rows: document.querySelector("#rows"),
  emptyState: document.querySelector("#emptyState"),
  tableWrap: document.querySelector("#tableWrap"),
  total: document.querySelector("#total"),
  pending: document.querySelector("#pending"),
  interview: document.querySelector("#interview"),
  accepted: document.querySelector("#accepted"),
  date: document.querySelector("#date"),
  company: document.querySelector("#company"),
  role: document.querySelector("#role"),
  status: document.querySelector("#status"),
  contactEmail: document.querySelector("#contactEmail"),
  phone: document.querySelector("#phone"),
  note: document.querySelector("#note")
};

let applications = [];
let currentUser = null;
let editId = null;
let unsubscribeApplications = null;

function showMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function friendlyAuthError(error) {
  const messages = {
    "auth/email-already-in-use": "An account already exists for this email.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again."
  };
  return messages[error.code] || "Something went wrong. Please try again.";
}

function switchAuth(mode) {
  const login = mode === "login";
  elements.loginForm.classList.toggle("hidden", !login);
  elements.signupForm.classList.toggle("hidden", login);
  elements.loginTab.classList.toggle("active", login);
  elements.signupTab.classList.toggle("active", !login);
  elements.loginTab.setAttribute("aria-selected", String(login));
  elements.signupTab.setAttribute("aria-selected", String(!login));
  showMessage(elements.authMessage, "");
}

elements.loginTab.addEventListener("click", () => switchAuth("login"));
elements.signupTab.addEventListener("click", () => switchAuth("signup"));

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim();
  const password = document.querySelector("#loginPassword").value;
  if (!email || !password) return showMessage(elements.authMessage, "Enter your email and password.");
  try {
    showMessage(elements.authMessage, "Logging in…", true);
    await signInWithEmailAndPassword(auth, email, password);
    elements.loginForm.reset();
  } catch (error) {
    showMessage(elements.authMessage, friendlyAuthError(error));
  }
});

elements.signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.querySelector("#signupEmail").value.trim();
  const password = document.querySelector("#signupPassword").value;
  const confirmPassword = document.querySelector("#signupConfirm").value;
  if (!email || !password) return showMessage(elements.authMessage, "Enter an email and password.");
  if (password.length < 6) return showMessage(elements.authMessage, "Use at least 6 characters for your password.");
  if (password !== confirmPassword) return showMessage(elements.authMessage, "The passwords do not match.");
  try {
    showMessage(elements.authMessage, "Creating your account…", true);
    await createUserWithEmailAndPassword(auth, email, password);
    elements.signupForm.reset();
  } catch (error) {
    showMessage(elements.authMessage, friendlyAuthError(error));
  }
});

elements.logoutButton.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (unsubscribeApplications) {
    unsubscribeApplications();
    unsubscribeApplications = null;
  }
  if (user) {
    elements.welcome.classList.add("hidden");
    elements.dashboard.classList.remove("hidden");
    elements.userEmail.textContent = user.email || "your account";
    listenToApplications();
  } else {
    applications = [];
    resetEditor();
    render();
    elements.dashboard.classList.add("hidden");
    elements.welcome.classList.remove("hidden");
  }
});

function applicationsCollection() {
  return collection(db, "users", currentUser.uid, "applications");
}

function listenToApplications() {
  const applicationsQuery = query(applicationsCollection(), orderBy("createdAt", "desc"));
  unsubscribeApplications = onSnapshot(applicationsQuery, (snapshot) => {
    applications = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
    render();
  }, () => {
    showMessage(elements.applicationMessage, "Could not load applications. Check the Firebase security rules.");
  });
}

elements.applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const application = {
    date: elements.date.value,
    company: elements.company.value.trim(),
    role: elements.role.value.trim(),
    status: elements.status.value,
    contactEmail: elements.contactEmail.value.trim(),
    phone: elements.phone.value.trim(),
    note: elements.note.value.trim()
  };
  if (!application.date || !application.company || !application.role) {
    return showMessage(elements.applicationMessage, "Date, company and role are required.");
  }
  try {
    if (editId) {
      await updateDoc(doc(db, "users", currentUser.uid, "applications", editId), application);
      showMessage(elements.applicationMessage, "Application updated.", true);
    } else {
      await addDoc(applicationsCollection(), { ...application, createdAt: serverTimestamp() });
      showMessage(elements.applicationMessage, "Application added.", true);
    }
    resetEditor();
  } catch {
    showMessage(elements.applicationMessage, "The application could not be saved.");
  }
});

function resetEditor() {
  editId = null;
  elements.applicationForm.reset();
  elements.status.value = "Pending";
  elements.saveButton.textContent = "Add application";
  elements.editorTitle.textContent = "Add an application";
  elements.cancelEditButton.classList.add("hidden");
}

elements.cancelEditButton.addEventListener("click", () => {
  resetEditor();
  showMessage(elements.applicationMessage, "");
});

function editApplication(id) {
  const application = applications.find((item) => item.id === id);
  if (!application) return;
  editId = id;
  elements.date.value = application.date || "";
  elements.company.value = application.company || "";
  elements.role.value = application.role || "";
  elements.status.value = application.status || "Pending";
  elements.contactEmail.value = application.contactEmail || "";
  elements.phone.value = application.phone || "";
  elements.note.value = application.note || "";
  elements.saveButton.textContent = "Save changes";
  elements.editorTitle.textContent = "Edit application";
  elements.cancelEditButton.classList.remove("hidden");
  elements.editorTitle.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deleteApplication(id) {
  if (!currentUser || !window.confirm("Delete this application?")) return;
  try {
    await deleteDoc(doc(db, "users", currentUser.uid, "applications", id));
  } catch {
    showMessage(elements.applicationMessage, "The application could not be deleted.");
  }
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function noteHTML(note) {
  const safe = escapeHTML(note);
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return safe.replace(urlPattern, '<a class="note-link" href="$1" target="_blank" rel="noopener noreferrer">Open link ↗</a>');
}

function render() {
  const search = elements.search.value.trim().toLowerCase();
  const status = elements.filter.value;
  const filtered = applications.filter((application) => {
    const searchable = [application.company, application.role, application.contactEmail, application.note].join(" ").toLowerCase();
    return searchable.includes(search) && (status === "All" || application.status === status);
  });

  elements.rows.innerHTML = filtered.map((application) => `
    <tr>
      <td>${escapeHTML(application.date)}</td>
      <td><strong>${escapeHTML(application.company)}</strong></td>
      <td>${escapeHTML(application.role)}</td>
      <td><span class="status-pill status-${escapeHTML(application.status || "Pending")}">${escapeHTML(application.status || "Pending")}</span></td>
      <td>${escapeHTML(application.contactEmail || application.phone || "—")}</td>
      <td>${noteHTML(application.note || "—")}</td>
      <td><div class="row-actions"><button class="row-button edit" data-edit="${application.id}" type="button">Edit</button><button class="row-button delete" data-delete="${application.id}" type="button">Delete</button></div></td>
    </tr>
  `).join("");

  elements.emptyState.classList.toggle("hidden", filtered.length > 0);
  elements.tableWrap.classList.toggle("hidden", filtered.length === 0);
  elements.total.textContent = applications.length;
  elements.pending.textContent = applications.filter((item) => (item.status || "Pending") === "Pending").length;
  elements.interview.textContent = applications.filter((item) => item.status === "Interview").length;
  elements.accepted.textContent = applications.filter((item) => item.status === "Accepted").length;
}

elements.rows.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) editApplication(editButton.dataset.edit);
  if (deleteButton) deleteApplication(deleteButton.dataset.delete);
});

elements.search.addEventListener("input", render);
elements.filter.addEventListener("change", render);

elements.exportButton.addEventListener("click", () => {
  const headers = ["Date", "Company", "Role", "Status", "Contact email", "Phone", "Notes"];
  const lines = applications.map((application) => [
    application.date,
    application.company,
    application.role,
    application.status || "Pending",
    application.contactEmail,
    application.phone,
    application.note
  ].map((value) => `"${String(value || "").replaceAll('"', '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "job-applications.csv";
  link.click();
  URL.revokeObjectURL(url);
});
