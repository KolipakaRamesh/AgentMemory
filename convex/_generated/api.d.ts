/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as agentActions from "../agentActions.js";
import type * as conversations from "../conversations.js";
import type * as crons from "../crons.js";
import type * as lib_contextBuilder from "../lib/contextBuilder.js";
import type * as lib_embeddings from "../lib/embeddings.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as memory from "../memory.js";
import type * as memoryConsolidate from "../memoryConsolidate.js";
import type * as memoryExtract from "../memoryExtract.js";
import type * as memorySearch from "../memorySearch.js";
import type * as messages from "../messages.js";
import type * as rateLimits from "../rateLimits.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  agentActions: typeof agentActions;
  conversations: typeof conversations;
  crons: typeof crons;
  "lib/contextBuilder": typeof lib_contextBuilder;
  "lib/embeddings": typeof lib_embeddings;
  "lib/openrouter": typeof lib_openrouter;
  memory: typeof memory;
  memoryConsolidate: typeof memoryConsolidate;
  memoryExtract: typeof memoryExtract;
  memorySearch: typeof memorySearch;
  messages: typeof messages;
  rateLimits: typeof rateLimits;
  sessions: typeof sessions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
