import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

type Params = Promise<{ path: string[] }>;

async function proxy(request: NextRequest, { params }: { params: Params }) {
  const { path } = await params;
  const targetUrl = `${BACKEND_URL}/${path.join('/')}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === 'host') continue;
    headers.set(key, value);
  }

  let body: BodyInit | null | undefined = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = request.body;
  }

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
    // @ts-ignore - needed for streaming request bodies
    duplex: 'half',
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
