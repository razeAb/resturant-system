// Automatically attach the worker token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("workerToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login if the API returns 401 (unauthorized)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("workerToken");
      localStorage.removeItem("worker");
      if (typeof window !== "undefined") {
        window.location.href = "/worker/login";
      }
    }
    return Promise.reject(error);
  }
);
