import axios, { AxiosInstance, AxiosError, AxiosProgressEvent, InternalAxiosRequestConfig, ResponseType } from "axios";
import type { AxiosResponse } from "axios";
import { isPlausibleJwt } from "@/lib/security-utils";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions<TBody = unknown> {
  body?: TBody;
  headers?: Record<string, string>;
  requiresCsrf?: boolean;
  withCredentials?: boolean;
  signal?: AbortSignal;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
  responseType?: ResponseType;
}

export interface ApiErrorPayload {
  message: string;
  status: number;
  details?: unknown;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.status = payload.status;
    this.details = payload.details;
  }
}

export class ApiClient {
  private readonly instance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly csrfCookieUrl: string;
  private csrfBootstrapPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.csrfCookieUrl = this.resolveCsrfCookieUrl(this.baseUrl);
    this.instance = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,
      withXSRFToken: true,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
    });

    this.setupInterceptors();
  }

  private resolveCsrfCookieUrl(baseUrl: string): string {
    if (/^https?:\/\//i.test(baseUrl)) {
      const parsedUrl = new URL(baseUrl);
      return `${parsedUrl.origin}/sanctum/csrf-cookie`;
    }

    if (typeof window !== "undefined") {
      return `${window.location.origin}/sanctum/csrf-cookie`;
    }

    return "/sanctum/csrf-cookie";
  }

  private setupInterceptors(): void {
    // Request interceptor for Guest JWT
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // 1. Add Guest JWT if in sessionStorage
        if (typeof window !== "undefined") {
          const guestToken = sessionStorage.getItem("guest_token");
          const requestPath = config.url ?? "";
          const isGuestRequest = requestPath.includes("/guest/");

          if (guestToken && !isPlausibleJwt(guestToken)) {
            sessionStorage.removeItem("guest_token");
          } else if (guestToken && isGuestRequest) {
            config.headers.Authorization = `Bearer ${guestToken}`;
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for 401 and 422
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (!error.response) {
          return Promise.reject(
            new ApiError({
              message: `Unable to reach API server (${this.baseUrl}). Make sure backend is running and CORS/SANCTUM_STATEFUL_DOMAINS are configured for this frontend origin.`,
              status: 0,
              details: { csrfCookieUrl: this.csrfCookieUrl },
            })
          );
        }

        const status = error.response?.status;
        const requestPath = error.config?.url ?? "";
        const data = error.response?.data as { message?: string; errors?: unknown } | undefined;

        if (status === 401 && requestPath.includes("/guest/")) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("guest_token");
            const slugMatch = window.location.pathname.match(/\/i\/([^/]+)/);
            if (slugMatch?.[1]) {
              window.location.href = `/i/${slugMatch[1]}`;
            }
          }
        }

        // 422 Unprocessable Entity -> Structure validation errors
        if (status === 422) {
          return Promise.reject(
            new ApiError({
              message: data?.message ?? "Validation failed",
              status: 422,
              details: data?.errors,
            })
          );
        }

        // Generic error handling
        return Promise.reject(
          new ApiError({
            message: data?.message ?? error.message,
            status: status || 500,
            details: data?.errors,
          })
        );
      }
    );
  }

  public async bootstrapCsrf(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const hasXsrfCookie = document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("XSRF-TOKEN="));

    if (hasXsrfCookie) {
      return;
    }

    if (this.csrfBootstrapPromise) {
      return this.csrfBootstrapPromise;
    }

    this.csrfBootstrapPromise = (async () => {
      try {
        // Use direct axios call for bootstrap to avoid circular interceptor call if we were using this.instance
        await axios.get(this.csrfCookieUrl, {
          withCredentials: true,
        });
      } catch (error) {
        const axiosError = error as AxiosError;
        const data = axiosError.response?.data as { message?: string } | undefined;

        throw new ApiError({
          message:
            data?.message ??
            `CSRF bootstrap failed at ${this.csrfCookieUrl}. Verify backend availability and Sanctum CORS/cookie settings.`,
          status: axiosError.response?.status ?? 0,
          details: axiosError.response?.data,
        });
      } finally {
        this.csrfBootstrapPromise = null;
      }
    })();

    return this.csrfBootstrapPromise;
  }

  public async get<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const response = await this.instance.get<TResponse>(path, {
      headers: options.headers,
      signal: options.signal,
      responseType: options.responseType,
    });
    return response.data;
  }

  public async post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiRequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const shouldBootstrapCsrf = options.requiresCsrf ?? true;

    if (shouldBootstrapCsrf) {
      await this.bootstrapCsrf();
    }

    const response = await this.instance.post<TResponse>(path, body, {
      headers: options.headers,
      signal: options.signal,
      onUploadProgress: options.onUploadProgress,
    });
    return response.data;
  }

  public async put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiRequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const shouldBootstrapCsrf = options.requiresCsrf ?? true;

    if (shouldBootstrapCsrf) {
      await this.bootstrapCsrf();
    }

    const response = await this.instance.put<TResponse>(path, body, {
      headers: options.headers,
      signal: options.signal,
      onUploadProgress: options.onUploadProgress,
    });
    return response.data;
  }

  public async patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: ApiRequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const shouldBootstrapCsrf = options.requiresCsrf ?? true;

    if (shouldBootstrapCsrf) {
      await this.bootstrapCsrf();
    }

    const response = await this.instance.patch<TResponse>(path, body, {
      headers: options.headers,
      signal: options.signal,
      onUploadProgress: options.onUploadProgress,
    });
    return response.data;
  }

  public async delete<TResponse>(path: string, options: ApiRequestOptions = {}): Promise<TResponse> {
    const shouldBootstrapCsrf = options.requiresCsrf ?? true;

    if (shouldBootstrapCsrf) {
      await this.bootstrapCsrf();
    }

    const response = await this.instance.delete<TResponse>(path, {
      headers: options.headers,
      signal: options.signal,
    });
    return response.data;
  }
}

export function resolvePublicApiOrigin(): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (envBaseUrl) return envBaseUrl;
  return "";
}

const configuredApiBaseUrl = resolvePublicApiOrigin().replace(/\/+$/, "");
const resolvedBaseUrl = configuredApiBaseUrl ? `${configuredApiBaseUrl}/api/v1` : "/api/v1";

export const apiClient = new ApiClient(resolvedBaseUrl);
