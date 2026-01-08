import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Cria a instância do axios com a URL base da API
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 30000, // 30 segundos
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptador de requisição: adiciona o token JWT em todas as requisições
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptador de resposta: trata erros globalmente
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Se o erro for 401 (não autorizado) e não for uma tentativa de retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Tenta fazer refresh do token
        const refreshToken = localStorage.getItem("refresh_token");

        if (refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const { access_token } = response.data;

          // Atualiza o token no localStorage
          localStorage.setItem("access_token", access_token);

          // Atualiza o header da requisição original com o novo token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          // Refaz a requisição original
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Se o refresh falhar, limpa os dados e redireciona para login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");

        // Redireciona para login
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    // Para outros erros, apenas rejeita
    return Promise.reject(error);
  }
);

export default api;
