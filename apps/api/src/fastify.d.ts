import "@fastify/jwt";
import "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { TraceContext } from "@funnel/shared";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    traceContext: TraceContext;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; orgId: string; role: string };
    user: { userId: string; orgId: string; role: string };
  }
}
