const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${normalizedPath}`;
};
