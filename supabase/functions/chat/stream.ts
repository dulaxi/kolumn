export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }
}

export function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export class SSEWriter {
  private encoder = new TextEncoder()
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null
  private closed = false
  public stream: ReadableStream<Uint8Array>

  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller
      },
    })
  }

  write(data: Record<string, unknown>) {
    if (this.closed) return
    this.controller?.enqueue(this.encoder.encode(sseEvent(data)))
  }

  close(stopReason: string | null = null) {
    if (this.closed) return
    this.write({ type: "done", stopReason })
    this.closed = true
    this.controller?.close()
  }

  error(message: string) {
    if (this.closed) return
    this.write({ type: "error", content: message })
    this.closed = true
    this.controller?.close()
  }
}
