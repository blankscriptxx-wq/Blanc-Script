import { getAuth } from "@/lib/auth/server";

type Handler = (req: Request, ctx: unknown) => Promise<Response>;
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

let handlers: Record<Method, Handler> | undefined;
const route =
  (m: Method): Handler =>
  (req, ctx) => {
    handlers ??= getAuth().handler() as unknown as Record<Method, Handler>;
    return handlers[m](req, ctx);
  };

export const GET = route("GET");
export const POST = route("POST");
export const PUT = route("PUT");
export const PATCH = route("PATCH");
export const DELETE = route("DELETE");
