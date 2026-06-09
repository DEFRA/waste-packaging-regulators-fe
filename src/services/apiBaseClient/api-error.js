export class ApiError extends Error {
  constructor({
    status,
    type = null,
    title = null,
    detail = null,
    instance = null,
    traceId = null,
    errors = null,
    message = null
  }) {
    super(
      message ?? detail ?? title ?? `API request failed with status ${status}`
    )
    this.name = 'ApiError'
    this.status = status
    this.type = type
    this.title = title
    this.detail = detail
    this.instance = instance
    this.traceId = traceId
    this.errors = errors
  }

  static from({ message, status, body }) {
    return new ApiError({
      status,
      message,
      type: body?.type ?? null,
      title: body?.title ?? null,
      detail: body?.detail ?? null,
      instance: body?.instance ?? null,
      traceId: body?.traceId ?? null,
      errors: body?.errors ?? null
    })
  }
}
