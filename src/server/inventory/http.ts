import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { MongoServerError } from 'mongodb'
import { InventoryError, isRecord } from './errors'

export function json<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type')
  if (!contentType?.toLowerCase().includes('application/json')) {
    throw new InventoryError(415, 'unsupported_media_type', 'Request content type must be application/json.')
  }
  return request.json() as Promise<unknown>
}

export function problem(error: unknown, request: Request): NextResponse {
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  if (error instanceof ZodError) {
    return NextResponse.json({
      type: 'https://cafe-shop.local/problems/validation-error',
      title: 'Your request has invalid fields', status: 422,
      detail: 'Please correct the highlighted fields and try again.', instance: new URL(request.url).pathname,
      traceId, errors: error.issues.map((issue) => ({ field: issue.path.join('.'), code: issue.code, message: issue.message })),
    }, { status: 422, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' } })
  }
  if (error instanceof InventoryError) {
    return NextResponse.json({
      type: `https://cafe-shop.local/problems/${error.code}`, title: error.message,
      status: error.status, detail: error.message, instance: new URL(request.url).pathname, traceId,
      ...(error.details !== undefined ? { errors: error.details } : {}),
    }, { status: error.status, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' } })
  }
  if (error instanceof MongoServerError && error.code === 11000) {
    return NextResponse.json({
      type: 'https://cafe-shop.local/problems/conflict', title: 'A record with that value already exists.',
      status: 409, detail: 'Use a different name or SKU and try again.', instance: new URL(request.url).pathname, traceId,
    }, { status: 409, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' } })
  }
  console.error(JSON.stringify({ event: 'inventory.request_failed', trace_id: traceId, path: new URL(request.url).pathname, error: isRecord(error) && typeof error.message === 'string' ? error.message : 'unknown_error' }))
  return NextResponse.json({
    type: 'https://cafe-shop.local/problems/internal-error', title: 'The request could not be completed.',
    status: 500, detail: 'Please try again later.', instance: new URL(request.url).pathname, traceId,
  }, { status: 500, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' } })
}

export function withProblemHandling(handler: () => Promise<Response>, request: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return Promise.resolve(problem(
      new InventoryError(503, 'database_not_configured', 'MongoDB is not configured. Set DATABASE_URL on the server to enable the inventory API.'),
      request,
    ))
  }
  return handler().catch((error: unknown) => problem(error, request))
}
