(() => {
  "use strict";
  const config = window.SUPABASE_CONFIG || {};
  const ready = Boolean(window.supabase && config.url && config.anonKey &&
    !config.url.startsWith("YOUR_") && !config.anonKey.startsWith("YOUR_"));
  const client = ready ? window.supabase.createClient(config.url, config.anonKey) : null;
  const $ = (selector) => document.querySelector(selector);
  const notice = (message, isError = false) => {
    const box = $("#appNotice");
    if (!box) { window.alert(message); return; }
    box.textContent = message; box.hidden = false;
    box.style.background = isError ? "#fff0ef" : "";
    box.style.borderColor = isError ? "#f3c5c1" : "";
    box.style.color = isError ? "#9b241c" : "";
  };
  const requireBackend = () => {
    if (ready) return true;
    notice("Backend is not connected yet. Complete the Supabase setup in README.md and add the project keys.", true);
    return false;
  };
  const showError = (error) => notice(error?.message || "Something went wrong. Please try again.", true);
  const setBusy = (form, busy) => {
    const button = form?.querySelector('button[type="submit"]');
    if (button) { button.disabled = busy; button.dataset.oldText ||= button.textContent; button.textContent = busy ? "Please wait…" : button.dataset.oldText; }
  };
  const getProfile = async (userId) => {
    const { data, error } = await client.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    return data;
  };

  async function init() {
    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
    if (!$("#appNotice") && $("main")) {
      const box = document.createElement("div");
      box.id = "appNotice"; box.className = "notice"; box.hidden = true;
      $("main").prepend(box);
    }
    if (!ready) {
      const setupHint = $("#backendHint");
      if (setupHint) setupHint.hidden = false;
      return;
    }
    const { data: { session } } = await client.auth.getSession();
    const page = document.body.dataset.page;
    if (page === "register") bindRegister();
    if (page === "login") bindLogin();
    if (page === "profile") await initProfile(session);
    if (page === "settings") await initSettings(session);
    const logout = $("#logoutButton");
    if (logout) logout.addEventListener("click", async () => {
      const { error } = await client.auth.signOut();
      if (error) return showError(error);
      location.href = "index.html";
    });
  }

  function bindRegister() {
    const form = $("#registerForm");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!requireBackend()) return;
      const data = new FormData(form);
      const displayName = String(data.get("display_name") || "").trim();
      const email = String(data.get("email") || "").trim().toLowerCase();
      const password = String(data.get("password") || "");
      const confirm = String(data.get("confirm_password") || "");
      if (password.length < 8) return notice("Password must contain at least 8 characters.", true);
      if (password !== confirm) return notice("Passwords do not match.", true);
      setBusy(form, true);
      try {
        const { data: result, error } = await client.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
        if (error) throw error;
        if (result.session) location.href = "user_profile.html";
        else notice("Registration received. Check your email to confirm your account, then log in.");
        form.reset();
      } catch (error) { showError(error); }
      finally { setBusy(form, false); }
    });
  }

  function bindLogin() {
    const form = $("#loginForm");
    if (!form) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!requireBackend()) return;
      const data = new FormData(form); setBusy(form, true);
      try {
        const { error } = await client.auth.signInWithPassword({
          email: String(data.get("email") || "").trim().toLowerCase(),
          password: String(data.get("password") || "")
        });
        if (error) throw error;
        location.href = "user_profile.html";
      } catch (error) { showError(error); }
      finally { setBusy(form, false); }
    });
    $("#forgotPassword")?.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!requireBackend()) return;
      const email = String($("#loginEmail")?.value || "").trim().toLowerCase();
      if (!email) return notice("Enter your email address first.", true);
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname.replace(/login\.html$/, "settings.html")
      });
      if (error) showError(error); else notice("If that email is registered, a password reset link has been sent.");
    });
  }

  async function initProfile(session) {
    if (!session) { location.href = "login.html"; return; }
    try {
      const profile = await getProfile(session.user.id);
      $("#profileName").textContent = profile.display_name;
      $("#profileBio").textContent = profile.bio || "Add a short introduction about yourself.";
      $("#nameInput").value = profile.display_name || "";
      $("#bioInput").value = profile.bio || "";
      $("#profileEmail").textContent = session.user.email || "";
      if (profile.avatar_url) $("#avatarImage").src = profile.avatar_url;
      $("#profileForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const display_name = $("#nameInput").value.trim(), bio = $("#bioInput").value.trim();
        if (!display_name) return notice("Display name is required.", true);
        const { error } = await client.from("profiles").update({ display_name, bio, updated_at: new Date().toISOString() }).eq("id", session.user.id);
        if (error) return showError(error);
        $("#profileName").textContent = display_name;
        $("#profileBio").textContent = bio || "Add a short introduction about yourself.";
        notice("Profile saved.");
      });
      $("#avatarInput").addEventListener("change", async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024)
          return notice("Choose a JPG, PNG or WebP image under 2 MB.", true);
        const path = session.user.id + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "");
        const { error: uploadError } = await client.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) return showError(uploadError);
        const { data } = client.storage.from("avatars").getPublicUrl(path);
        const { error: saveError } = await client.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", session.user.id);
        if (saveError) return showError(saveError);
        $("#avatarImage").src = data.publicUrl; notice("Profile photo updated.");
      });
      await loadMessages(session.user.id);
      $("#messageForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const field = $("#messageInput"), body = field.value.trim();
        if (!body || body.length > 500) return notice("Message must be between 1 and 500 characters.", true);
        const button = $("#sendMessageButton"); button.disabled = true;
        const { error } = await client.from("messages").insert({ user_id: session.user.id, body });
        button.disabled = false;
        if (error) return showError(error);
        field.value = ""; await loadMessages(session.user.id); notice("Message posted.");
      });
    } catch (error) { showError(error); }
  }

  async function loadMessages(currentUserId) {
    const { data, error } = await client.from("messages")
      .select("id,user_id,body,created_at,profiles(display_name)")
      .order("created_at", { ascending: false }).limit(40);
    if (error) throw error;
    const feed = $("#messageFeed"); feed.replaceChildren();
    if (!data?.length) {
      const empty = document.createElement("p"); empty.className = "muted small"; empty.textContent = "No messages yet. Start the conversation.";
      feed.append(empty); return;
    }
    data.forEach(item => {
      const article = document.createElement("article"); article.className = "message";
      const head = document.createElement("div"); head.className = "message-head";
      const author = document.createElement("strong"); author.textContent = item.profiles?.display_name || "Member";
      const date = document.createElement("time"); date.textContent = new Date(item.created_at).toLocaleString();
      head.append(author, date);
      const body = document.createElement("p"); body.textContent = item.body;
      article.append(head, body);
      if (item.user_id === currentUserId) {
        const remove = document.createElement("button"); remove.type = "button"; remove.className = "secondary small"; remove.textContent = "Delete";
        remove.addEventListener("click", async () => {
          const { error: deleteError } = await client.from("messages").delete().eq("id", item.id);
          if (deleteError) return showError(deleteError);
          await loadMessages(currentUserId);
        });
        article.append(remove);
      }
      feed.append(article);
    });
  }

  async function initSettings(session) {
    if (!session) { location.href = "login.html"; return; }
    $("#settingsEmail").textContent = session.user.email || "";
    try {
      const profile = await getProfile(session.user.id), prefs = profile.preferences || {};
      $("#emailNotifications").checked = prefs.email_notifications !== false;
      $("#publicProfile").checked = prefs.public_profile !== false;
      const savePreferences = async () => {
        const next = { email_notifications: $("#emailNotifications").checked, public_profile: $("#publicProfile").checked };
        const { error } = await client.from("profiles").update({ preferences: next, updated_at: new Date().toISOString() }).eq("id", session.user.id);
        if (error) showError(error); else notice("Preferences saved.");
      };
      $("#emailNotifications").addEventListener("change", savePreferences);
      $("#publicProfile").addEventListener("change", savePreferences);
      $("#passwordForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = $("#newPassword").value;
        if (password.length < 8) return notice("Use at least 8 characters for your password.", true);
        const { error } = await client.auth.updateUser({ password });
        if (error) return showError(error);
        $("#passwordForm").reset(); notice("Password updated.");
      });
    } catch (error) { showError(error); }
  }
  document.addEventListener("DOMContentLoaded", () => { init().catch(showError); });
})();
