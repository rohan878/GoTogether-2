import axios from "axios";

export const API_ORIGIN =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:1577";

export const api = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
