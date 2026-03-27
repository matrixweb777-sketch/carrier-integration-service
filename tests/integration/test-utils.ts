import type { HttpClient, HttpRequestConfig, HttpResponse } from "../../src/infrastructure/http/http-client";

type QueueItem = HttpResponse<unknown> | Error;

export class StubHttpClient implements HttpClient {
  public readonly requests: HttpRequestConfig[] = [];
  private readonly queue: QueueItem[] = [];

  enqueueResponse(response: HttpResponse<unknown>): void {
    this.queue.push(response);
  }

  enqueueError(error: Error): void {
    this.queue.push(error);
  }

  async request<T = unknown>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    this.requests.push(config);
    const next = this.queue.shift();

    if (!next) {
      throw new Error("StubHttpClient queue is empty");
    }

    if (next instanceof Error) {
      throw next;
    }

    return next as HttpResponse<T>;
  }
}
