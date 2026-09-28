export function handleBible(request: Request): Promise<Response>;
export function bibleExpressMiddleware(req: { originalUrl: string; method: string }, res: {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
  send(body: string): unknown;
}): Promise<void>;