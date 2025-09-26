// Save user credentials in localStorage (demo only)
const usersKey = "movie_users";
const currentUserKey = "current_user";

function getUsers() {
  return JSON.parse(localStorage.getItem(usersKey)) || [];
}
function saveUsers(users) {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // --- SIGNUP ---
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("signupUser").value.trim();
      const password = document.getElementById("signupPass").value.trim();
      const users = getUsers();

      if (users.find((u) => u.username === username)) {
        alert("Username already exists!");
        return;
      }

      users.push({ username, password });
      saveUsers(users);
      alert("Signup successful! Please login.");
      window.location.href = "login.html";
    });
  }

  // --- LOGIN ---
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = document.getElementById("loginUser").value.trim();
      const password = document.getElementById("loginPass").value.trim();
      const users = getUsers();

      const user = users.find(
        (u) => u.username === username && u.password === password
      );

      if (user) {
        localStorage.setItem(currentUserKey, username);
        alert("Login successful!");
        window.location.href = "index.html";
      } else {
        alert("Invalid username or password!");
      }
    });
  }
});
