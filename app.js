/* Akilandosi front-end demo helpers.
   GitHub Pages is static hosting: data stays in this browser only.
   Use a trusted backend before collecting real passwords or personal data. */
(function () {
  "use strict";
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const users = () => read("ak_users", {});
  const currentEmail = () => localStorage.getItem("ak_session");
  const currentUser = () => {
    const all = users();
    return all[currentEmail()] || null;
  };
  const hash = async (value) => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  };
  const notice = (message) => {
    const node = document.getElementById("appNotice");
    if (node) { node.textContent = message; node.hidden = false; }
    else alert(message);
  };
  const saveUser = (user) => {
    const all = users();
    all[user.email.toLowerCase()] = user;
    write("ak_users", all);
    write("user", user);
  };

  window.handleSignup = async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const name = (data.name || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    const password = data.password || "";
    if (!name || !email || !data.dob || !data.address || !data.phone || !password) return notice("Please complete every field.");
    if (password.length < 8) return notice("Use a password with at least 8 characters.");
    if (password !== data.confirmPassword) return notice("The passwords do not match.");
    const all = users();
    if (all[email]) return notice("An account with this email already exists in this browser.");
    all[email] = { name, email, dob: data.dob, address: data.address, phone: data.phone, passwordHash: await hash(password), bio: "" };
    write("ak_users", all);
    write("user", all[email]);
    localStorage.setItem("ak_session", email);
    notice("Account created on this browser. You are now signed in.");
    form.reset();
    setTimeout(() => { location.href = "user_profile.html"; }, 700);
  };

  window.handleLogin = async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.querySelector('input[type="email"]').value.trim().toLowerCase();
    const password = form.querySelector('input[type="password"]').value;
    const user = users()[email];
    if (!user || !user.passwordHash || (await hash(password)) !== user.passwordHash) {
      return notice("Email or password is incorrect. Register again if this browser has no account.");
    }
    localStorage.setItem("ak_session", email);
    write("user", user);
    notice("Login successful. Opening your profile…");
    setTimeout(() => { location.href = "user_profile.html"; }, 500);
  };

  window.handleProfileUpdate = function (event) {
    event.preventDefault();
    const user = currentUser() || read("user", null);
    if (!user) return notice("Please register or log in first.");
    user.name = document.getElementById("nameInput").value.trim();
    user.email = document.getElementById("emailInput").value.trim().toLowerCase();
    user.phone = document.getElementById("phoneInput").value.trim();
    user.bio = document.getElementById("bioInput").value.trim();
    const all = users();
    if (currentEmail() && user.email !== currentEmail()) delete all[currentEmail()];
    all[user.email] = user;
    write("ak_users", all);
    write("user", user);
    localStorage.setItem("ak_session", user.email);
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;
    notice("Profile updated successfully.");
  };

  window.updateFriendsList = function () {
    const list = document.getElementById("friendsList");
    if (!list) return;
    list.replaceChildren();
    read("friends", []).forEach(email => {
      const item = document.createElement("span");
      item.className = "skill";
      item.textContent = email;
      list.appendChild(item);
    });
  };
  window.updateMessages = function () {
    const box = document.getElementById("messages");
    if (!box) return;
    box.replaceChildren();
    read("messages", []).forEach(message => {
      const line = document.createElement("p");
      const sender = document.createElement("strong");
      sender.textContent = message.user + ": ";
      line.append(sender, document.createTextNode(message.text + " (" + message.time + ")"));
      box.appendChild(line);
    });
  };
  window.addFriend = function () {
    const field = document.getElementById("friendEmail");
    const email = field.value.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return notice("Enter a valid email address.");
    const friends = read("friends", []);
    if (friends.includes(email)) return notice("This email is already in your connections.");
    friends.push(email); write("friends", friends); field.value = ""; updateFriendsList();
  };
  window.sendMessage = function () {
    const field = document.getElementById("messageInput");
    const message = field.value.trim();
    if (!message) return;
    const user = currentUser() || read("user", {});
    const messages = read("messages", []);
    messages.push({ user: user.name || "Guest", text: message.slice(0, 500), time: new Date().toLocaleString() });
    write("messages", messages); field.value = ""; updateMessages();
  };

  document.addEventListener("DOMContentLoaded", () => {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
    const noticeNode = document.createElement("p");
    noticeNode.id = "appNotice"; noticeNode.className = "app-notice"; noticeNode.hidden = true;
    const main = document.querySelector("main");
    if (main) main.prepend(noticeNode);
    const user = currentUser() || read("user", null);
    if (user && document.getElementById("nameInput")) {
      document.getElementById("nameInput").value = user.name || "";
      document.getElementById("emailInput").value = user.email || "";
      document.getElementById("phoneInput").value = user.phone || "";
      document.getElementById("bioInput").value = user.bio || "";
      document.getElementById("profileName").textContent = user.name || "Akilandosi User";
      document.getElementById("profileEmail").textContent = user.email || "";
    }
    updateFriendsList(); updateMessages();

    document.querySelectorAll(".setting input[type=checkbox]").forEach((input, index) => {
      const key = "ak_setting_" + index;
      const saved = localStorage.getItem(key);
      if (saved !== null) input.checked = saved === "true";
      input.addEventListener("change", () => localStorage.setItem(key, String(input.checked)));
    });
    const buttons = Array.from(document.querySelectorAll("button"));
    const change = buttons.find(button => /change password/i.test(button.textContent));
    if (change) change.addEventListener("click", async () => {
      const user = currentUser();
      if (!user) return notice("Please log in first.");
      const oldPassword = prompt("Enter your current password:");
      if (oldPassword === null) return;
      if ((await hash(oldPassword)) !== user.passwordHash) return notice("Current password is incorrect.");
      const next = prompt("Enter a new password (at least 8 characters):");
      if (!next || next.length < 8) return notice("Password must contain at least 8 characters.");
      user.passwordHash = await hash(next); saveUser(user); notice("Password changed on this browser.");
    });
    const remove = buttons.find(button => /delete account/i.test(button.textContent));
    if (remove) remove.addEventListener("click", () => {
      const email = currentEmail();
      if (!email) return notice("No signed-in account was found.");
      if (!confirm("Delete this locally stored account and its profile?")) return;
      const all = users(); delete all[email]; write("ak_users", all);
      localStorage.removeItem("user"); localStorage.removeItem("ak_session");
      localStorage.removeItem("avatar");
      notice("Local account data deleted."); setTimeout(() => location.href = "index.html", 700);
    });
    const nav = document.querySelector("nav");
    if (nav && currentEmail() && !nav.querySelector("[data-logout]")) {
      const link = document.createElement("a");
      link.href = "#"; link.textContent = "Logout"; link.dataset.logout = "true";
      link.addEventListener("click", event => {
        event.preventDefault(); localStorage.removeItem("ak_session"); location.href = "index.html";
      });
      nav.appendChild(link);
    }
  });
})();