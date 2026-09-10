type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

export function authErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return mapAuthText(error);
  if (!error || typeof error !== "object") return "Authentication failed. Please try again.";
  const value = error as AuthErrorLike;
  const code = (value.code ?? "").toLowerCase();
  const message = value.message ?? "";
  const mappedCode = mapAuthCode(code);
  if (mappedCode) return mappedCode;
  if (message) return mapAuthText(message);
  return "Authentication failed. Please try again.";
}

function mapAuthCode(code: string): string | null {
  switch (code) {
    case "invalid_credentials":
    case "invalid_login_credentials":
      return "Invalid email or password.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Sign in instead.";
    case "email_not_confirmed":
      return "Confirm your email address before signing in.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a moment and try again.";
    case "weak_password":
      return "Password is too weak. Use at least 6 characters.";
    case "same_password":
      return "Choose a different password.";
    case "network_error":
      return "Network error. Check your connection and try again.";
    default:
      return null;
  }
}

function mapAuthText(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("failed to fetch") || text.includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  if (text.includes("invalid login credentials") || text.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (text.includes("user already registered") || text.includes("already registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return message;
}
