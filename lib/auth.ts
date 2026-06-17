import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "pharmatrack_jwt";

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  pharmacy_id: number | null;
};

export const saveToken = (token: string) =>
  SecureStore.setItemAsync(TOKEN_KEY, token);

export const loadToken = () => SecureStore.getItemAsync(TOKEN_KEY);

export const deleteToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

export const authHeader = async (): Promise<Record<string, string>> => {
  const token = await loadToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
