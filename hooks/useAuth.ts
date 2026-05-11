export type UserRole = "admin" | "vendor" | null;

type AuthState = {
  isAuthenticated: boolean;
  role: UserRole;
};

export const useAuth = (): AuthState => {
  return {
    isAuthenticated: false,
    role: null
  };
};
