import { create } from "zustand";

interface AuthState {
  userRole: string;
  setUserRole: (role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userRole: "",
  setUserRole: (role) => set({ userRole: role }),
  logout: () => set({ userRole: "" }),
}));
