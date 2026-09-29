import axios from "axios";

export const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  withCredentials: true,
});

const TOKEN_KEY = "sv_access_token";
const REFRESH_KEY = "sv_refresh_token";

export const saveAuth = (data) => {
  if (data && data.access_token) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token || "");
  }
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original.__retried &&
      localStorage.getItem(REFRESH_KEY) &&
      !original.url.includes("/auth/")
    ) {
      original.__retried = true;
      try {
        refreshing =
          refreshing ||
          axios
            .post(`${api.defaults.baseURL}/auth/refresh`, {
              refresh_token: localStorage.getItem(REFRESH_KEY),
            })
            .then(({ data }) => {
              if (data.access_token) {
                localStorage.setItem(TOKEN_KEY, data.access_token);
                localStorage.setItem(REFRESH_KEY, data.refresh_token || localStorage.getItem(REFRESH_KEY) || "");
              }
              return data;
            });
        const data = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        refreshing = null;
        clearAuth();
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(e) {
  const detail = e.response?.data?.detail;
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((x) => (x && typeof x.msg === "string" ? x.msg : JSON.stringify(x)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
