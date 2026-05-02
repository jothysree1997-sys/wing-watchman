const KEY = "chatb_auth";
export function isLoggedIn() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}
export function login() {
  localStorage.setItem(KEY, "1");
}
export function logout() {
  localStorage.removeItem(KEY);
}
