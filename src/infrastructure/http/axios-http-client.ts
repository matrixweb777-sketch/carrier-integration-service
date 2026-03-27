import axios, { AxiosError } from "axios";
import type { HttpClient, HttpRequestConfig, HttpResponse } from "./http-client";
import { NetworkError } from "../../errors";

export class AxiosHttpClient implements HttpClient {
  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    try {
      const response = await axios.request<T>({
        method: config.method,
        url: config.url,
        data: config.data,
        headers: config.headers,
        timeout: config.timeoutMs
      });

      return {
        status: response.status,
        headers: response.headers as Record<string, string | string[] | undefined>,
        data: response.data
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response) {
          return {
            status: error.response.status,
            headers: error.response.headers as Record<string, string | string[] | undefined>,
            data: error.response.data as T
          };
        }

        throw new NetworkError("HTTP request failed before receiving response", {
          message: error.message,
          code: error.code
        }, error);
      }

      throw error;
    }
  }
}
