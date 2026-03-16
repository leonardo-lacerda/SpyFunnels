import { create } from "zustand";

interface AuthState {
    token: string | null;
    user: { email: string; role: string } | null;
    login: (token: string, email: string, role?: string) => void;
    logout: () => void;
}

const storedToken = localStorage.getItem("auth_token");
const storedUser = localStorage.getItem("auth_user");

export const useAuthStore = create<AuthState>((set) => ({
    token: storedToken,
    user: storedUser ? JSON.parse(storedUser) as { email: string; role: string } : null,
    login: (token, email, role = "owner") => {
        localStorage.setItem("auth_token", token);
        const user = { email, role };
        localStorage.setItem("auth_user", JSON.stringify(user));
        set({ token, user });
    },
    logout: () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        set({ token: null, user: null });
    },
}));
