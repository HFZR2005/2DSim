import { handleMcp } from '../../study/mcp/protocol';

export const prerender = false;

export function OPTIONS({ request, url }: { request: Request; url: URL }) {
  return handleMcp(request, url);
}

export function GET({ request, url }: { request: Request; url: URL }) {
  return handleMcp(request, url);
}

export function POST({ request, url }: { request: Request; url: URL }) {
  return handleMcp(request, url);
}
