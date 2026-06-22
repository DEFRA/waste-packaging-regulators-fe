export class ApiError extends Error {
  constructor({
    status = null,
    type = null,
    title = null,
    detail = null,
    instance = null,
    traceId = null,
    errors = null,
    message = null,
    serviceName = null,
    method = null,
    url = null,
    cause = undefined
  }) {
    super(
      message ?? detail ?? title ?? `API request failed with status ${status}`,
      cause !== undefined ? { cause } : undefined
    )
    this.name = 'ApiError'
    this.status = status
    this.type = type
    this.title = title
    this.detail = detail
    this.instance = instance
    this.traceId = traceId
    this.errors = errors
    this.serviceName = serviceName
    this.method = method
    this.url = url
  }

  static from({ message, status, body, serviceName, method, url }) {
    return new ApiError({
      status,
      message,
      type: body?.type ?? null,
      title: body?.title ?? null,
      detail: body?.detail ?? null,
      instance: body?.instance ?? null,
      traceId: body?.traceId ?? null,
      errors: body?.errors ?? null,
      serviceName,
      method,
      url
    })
  }

  static networkFailure({ serviceName, method, url, cause }) {
    const reason = cause?.code ?? cause?.message ?? 'network error'
    return new ApiError({
      message: `${serviceName} ${method} ${url} failed: ${reason}`,
      serviceName,
      method,
      url,
      cause
    })
  }
}
