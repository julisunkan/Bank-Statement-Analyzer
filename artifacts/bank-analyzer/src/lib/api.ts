export function getAuthToken() {
  return localStorage.getItem("auth_token");
}
export function setAuthToken(token: string) {
  localStorage.setItem("auth_token", token);
}
export function clearAuthToken() {
  localStorage.removeItem("auth_token");
}
