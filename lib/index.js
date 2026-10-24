// src/config.ts
import Schema from "@deepseek-ai/schemastery";
var Config = Schema.object({
  port: Schema.number().default(9531).description("TCP port for the Design canvas."),
  dataDir: Schema.string().description("Optional Design data directory."),
  startupTimeoutMs: Schema.number().default(5e3).description("Canvas startup timeout in milliseconds."),
  shutdownTimeoutMs: Schema.number().default(3e3).description("Canvas shutdown grace period in milliseconds.")
});
function resolveConfig(config = {}) {
  const port = config.port ?? 9531;
  const startupTimeoutMs = config.startupTimeoutMs ?? 5e3;
  const shutdownTimeoutMs = config.shutdownTimeoutMs ?? 3e3;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new TypeError("design: port must be an integer between 1 and 65535");
  }
  if (!Number.isFinite(startupTimeoutMs) || startupTimeoutMs <= 0) {
    throw new TypeError("design: startupTimeoutMs must be a positive number");
  }
  if (!Number.isFinite(shutdownTimeoutMs) || shutdownTimeoutMs <= 0) {
    throw new TypeError("design: shutdownTimeoutMs must be a positive number");
  }
  if (config.dataDir !== void 0 && config.dataDir.trim() === "") {
    throw new TypeError("design: dataDir must not be empty");
  }
  return {
    port,
    startupTimeoutMs,
    shutdownTimeoutMs,
    ...config.dataDir === void 0 ? {} : { dataDir: config.dataDir }
  };
}

// src/runtime.ts
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
function isJsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object") return false;
  return Object.values(value).every(isJsonValue);
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
var DesignRuntime = class {
  constructor(config) {
    this.config = config;
    this.url = `http://127.0.0.1:${config.port}`;
  }
  config;
  url;
  child;
  ownedInstanceId;
  startTask;
  reused = false;
  /** Start the packaged runtime or reuse a healthy Design instance on the configured port. */
  start() {
    return this.startTask ??= this.startOnce().catch((error) => {
      this.startTask = void 0;
      throw error;
    });
  }
  /** Stop only the process started by this plugin instance. */
  async stop() {
    const child = this.child;
    this.child = void 0;
    this.startTask = void 0;
    if (!child || child.exitCode !== null || child.killed) return;
    child.kill("SIGTERM");
    const exited = new Promise((resolveExit) => child.once("exit", () => resolveExit()));
    const timedOut = delay(this.config.shutdownTimeoutMs).then(() => "timeout");
    if (await Promise.race([exited.then(() => "exited"), timedOut]) === "timeout") {
      child.kill("SIGKILL");
      await exited;
    }
  }
  /** Issue a JSON request after ensuring that the runtime is healthy. */
  async request(path, init = {}, signal) {
    await this.ensureHealthy();
    const response = await fetch(`${this.url}${path}`, {
      ...init,
      signal,
      headers: {
        ...init.body === void 0 ? {} : { "Content-Type": "application/json" },
        ...init.headers
      }
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
      const detail = body && typeof body === "object" && "error" in body ? String(body.error) : `HTTP ${response.status}`;
      throw new Error(`Design API ${response.status}: ${detail}`);
    }
    if (!isJsonValue(body)) throw new Error("Design API returned a non-JSON value");
    return body;
  }
  projectUrl(projectId) {
    return `${this.url}/projects/${encodeURIComponent(projectId)}`;
  }
  async startOnce() {
    const existing = await this.health();
    if (existing) {
      this.reused = true;
      return { url: this.url, reused: true, version: existing.version ?? "unknown" };
    }
    const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const appDirectory = resolve(pluginRoot, "app");
    const serverEntry = resolve(appDirectory, "dist/server.mjs");
    const instanceId = randomUUID();
    let stderr = "";
    const child = spawn(process.execPath, [serverEntry], {
      cwd: appDirectory,
      env: {
        ...process.env,
        HOST: "0.0.0.0",
        PORT: String(this.config.port),
        HUAHUA_DESIGN_APP_DIR: appDirectory,
        HUAHUA_DESIGN_INSTANCE_ID: instanceId,
        HUAHUA_DESIGN_VERSION: "0.1.0",
        ...this.config.dataDir === void 0 ? {} : { HUAHUA_DESIGN_DATA_DIR: this.config.dataDir }
      },
      stdio: ["ignore", "ignore", "pipe"]
    });
    this.child = child;
    this.ownedInstanceId = instanceId;
    child.stderr?.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-16384);
    });
    child.once("exit", () => {
      if (this.child === child) {
        this.child = void 0;
        this.startTask = void 0;
      }
    });
    const deadline = Date.now() + this.config.startupTimeoutMs;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`Design runtime exited with code ${child.exitCode}: ${stderr.trim() || "no diagnostics"}`);
      }
      const ready = await this.health();
      if (ready?.instanceId === instanceId) {
        this.reused = false;
        return { url: this.url, reused: false, version: ready.version ?? "0.1.0" };
      }
      await delay(100);
    }
    await this.stop();
    throw new Error(`Design runtime did not become healthy within ${this.config.startupTimeoutMs}ms${stderr ? `: ${stderr.trim()}` : ""}`);
  }
  async ensureHealthy() {
    const health = await this.health();
    if (health) return;
    if (this.child && this.child.exitCode === null) {
      throw new Error("Design runtime is not responding");
    }
    this.startTask = void 0;
    await this.start();
  }
  async health() {
    try {
      const response = await fetch(`${this.url}/api/health`, { signal: AbortSignal.timeout(500) });
      if (!response.ok) return void 0;
      const value = await response.json();
      return value.service === "design" ? value : void 0;
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") return void 0;
      if (error instanceof TypeError) return void 0;
      if (error instanceof DOMException && error.name === "AbortError") return void 0;
      throw new Error(`Design health check failed: ${errorMessage(error)}`, { cause: error });
    }
  }
};

// src/tools.ts
import { defineTool } from "@deepseek-ai/dsh-tools";
var ARTIFACT_TYPES = ["html", "markdown", "svg", "image", "video", "audio"];
var CARD_TYPES = ["title", "note", ...ARTIFACT_TYPES];
var THEMES = ["light", "dark", "system"];
var LOCALES = ["system", "zh-CN", "en", "ja", "es", "de"];
function cardFields(input) {
  if (input.cardType === "title") {
    if (input.content !== void 0 || input.artifact !== void 0) {
      throw new Error("Design title cards accept only a title");
    }
    return {};
  }
  if (input.cardType === "note") {
    if (input.content === void 0 || !input.content.trim()) {
      throw new Error("Design note cards require non-empty content");
    }
    if (input.artifact !== void 0) throw new Error("Design note cards do not accept artifact source");
    return { content: input.content };
  }
  if (input.content !== void 0) {
    throw new Error(`Design ${input.cardType} cards do not accept inline note content`);
  }
  return {
    artifactType: input.cardType,
    ...input.artifact === void 0 ? {} : { artifact: input.artifact }
  };
}
var PROJECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", required: true },
    title: { type: "string", required: true },
    prompt: { type: "string", required: true },
    created_at: { type: "string", required: true },
    updated_at: { type: "string", required: true }
  }
};
var NODE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", required: true },
    project_id: { type: "string", required: true },
    parent_id: { required: true, oneOf: [{ type: "string" }, { type: "null" }] },
    position: { type: "integer", required: true },
    type: { type: "string", required: true, enum: ["text", "html", "markdown", "svg", "image", "video", "audio", "error"] },
    title: { type: "string", required: true },
    content: { required: true, oneOf: [{ type: "string" }, { type: "null" }] },
    created_at: { type: "string", required: true },
    updated_at: { type: "string", required: true }
  }
};
function jsonBody(value) {
  return JSON.stringify(value);
}
function objectValue(value, operation) {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`Design ${operation} returned an invalid response`);
  }
  return value;
}
function stringValue(record, key, operation) {
  const value = record[key];
  if (typeof value !== "string") throw new Error(`Design ${operation} response is missing ${key}`);
  return value;
}
function integerValue(record, key, operation) {
  const value = record[key];
  if (!Number.isInteger(value)) throw new Error(`Design ${operation} response has an invalid ${key}`);
  return value;
}
function nullableStringValue(record, key, operation) {
  const value = record[key];
  if (value !== null && typeof value !== "string") throw new Error(`Design ${operation} response has an invalid ${key}`);
  return value;
}
function projectValue(value, operation) {
  const project = objectValue(value, operation);
  return {
    id: stringValue(project, "id", operation),
    title: stringValue(project, "title", operation),
    prompt: stringValue(project, "prompt", operation),
    created_at: stringValue(project, "created_at", operation),
    updated_at: stringValue(project, "updated_at", operation)
  };
}
function projectSummaryValue(value) {
  const project = objectValue(value, "project list");
  return {
    ...projectValue(value, "project list"),
    node_count: integerValue(project, "node_count", "project list"),
    generating_count: integerValue(project, "generating_count", "project list"),
    preview_node_id: nullableStringValue(project, "preview_node_id", "project list")
  };
}
function nodeValue(value, operation) {
  const node = objectValue(value, operation);
  const type = stringValue(node, "type", operation);
  if (!["text", "html", "markdown", "svg", "image", "video", "audio", "error"].includes(type)) {
    throw new Error(`Design ${operation} response has an invalid node type`);
  }
  return {
    id: stringValue(node, "id", operation),
    project_id: stringValue(node, "project_id", operation),
    parent_id: nullableStringValue(node, "parent_id", operation),
    position: integerValue(node, "position", operation),
    type,
    title: stringValue(node, "title", operation),
    content: nullableStringValue(node, "content", operation),
    created_at: stringValue(node, "created_at", operation),
    updated_at: stringValue(node, "updated_at", operation)
  };
}
function renderJson(value) {
  return [{ type: "text", text: JSON.stringify(value, null, 2) }];
}
function registerDesignTools(ctx, runtime) {
  ctx.systemPrompt.section({
    name: "tool:design",
    order: 160,
    text: [
      "Use Design when the user wants multiple creative directions, visual comparison, or branching revisions.",
      "Create the project first, tell the user it is available from the Design entry in the DSH sidebar, then build a balanced tree with the appropriate cardType for every node.",
      "Use title cards as compact hierarchy, round, category, or decision-point capsules. Use note cards for briefs, constraints, observations, rationale, copy, summaries, and other concise text that should remain visible on the canvas.",
      "Use HTML, Markdown, SVG, image, video, or audio cards only for actual rendered deliverables. Mix title, note, and artifact cards when that makes the canvas easier to scan; do not turn every thought into an artifact.",
      "Artifact cards may be created without artifact source as visible generating placeholders and completed incrementally with design_node_complete. Title cards have no content; note cards require content.",
      "Preserve alternatives: meaningful revisions become child nodes; later rounds belong under a titled round node instead of flattening every version under one parent.",
      "Design is a local presentation and versioning surface. You remain responsible for authoring every artifact.",
      "Never present the loopback Design service URL as the primary result. The integrated DSH workspace is the primary UI; the standalone URL is only an implementation detail and optional fallback."
    ].join(" ")
  });
  ctx.tools.register(defineTool({
    name: "design_start",
    description: "Start or connect to the Design workspace embedded in DeepSeek Harness.",
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ready: { type: "boolean", required: true },
          reused: { type: "boolean", required: true },
          version: { type: "string", required: true }
        }
      },
      render: () => [{ type: "text", text: "Design is ready in the DSH sidebar." }]
    },
    async execute() {
      const status = await runtime.start();
      return { ready: true, reused: status.reused, version: status.version };
    },
    presentCall: () => ({ card: "generic", title: "Open Design", kind: "other" })
  }));
  ctx.tools.register(defineTool({
    name: "design_project_create",
    description: "Create a Design project and root node before generating alternative directions. Tell the user to open the integrated Design workspace from the DSH sidebar.",
    parameters: {
      prompt: { type: "string", required: true, description: "The complete creative request represented by this project." },
      title: { type: "string", description: "Optional concise project title." }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", required: true },
          rootId: { type: "string", required: true },
          title: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Created Design project \u201C${value.title}\u201D. Open Design from the DSH sidebar to view it.` }]
    },
    async execute(args, exec) {
      const value = objectValue(await runtime.request("/api/projects", {
        method: "POST",
        body: jsonBody({ prompt: args.prompt, ...args.title === void 0 ? {} : { title: args.title } })
      }, exec.signal), "project creation");
      const projectId = stringValue(value, "id", "project creation");
      return {
        projectId,
        rootId: stringValue(value, "rootId", "project creation"),
        title: stringValue(value, "title", "project creation")
      };
    },
    presentCall: (args) => ({ card: "generic", title: args.title ?? "Create Design project", kind: "edit", rawInput: args })
  }));
  ctx.tools.register(defineTool({
    name: "design_project_list",
    description: "List existing Design projects so work can continue in the correct creative tree.",
    parameters: {},
    output: {
      schema: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            ...PROJECT_SCHEMA.properties,
            node_count: { type: "integer", required: true },
            generating_count: { type: "integer", required: true },
            preview_node_id: { required: true, oneOf: [{ type: "string" }, { type: "null" }] }
          }
        }
      },
      render: (_args, value) => renderJson(value)
    },
    async execute(_args, exec) {
      const value = await runtime.request("/api/projects", {}, exec.signal);
      if (!Array.isArray(value)) throw new Error("Design project list returned an invalid response");
      return value.map(projectSummaryValue);
    },
    presentCall: () => ({ card: "generic", title: "List Design projects", kind: "search" })
  }));
  ctx.tools.register(defineTool({
    name: "design_project_tree",
    description: "Read one complete Design tree. Use the returned stable node ids for all later additions and revisions.",
    parameters: {
      projectId: { type: "string", required: true }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          project: { ...PROJECT_SCHEMA, required: true },
          nodes: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                ...NODE_SCHEMA.properties,
                seq: { type: "integer", required: true },
                artifact_revision: { type: "string", required: true }
              }
            }
          }
        }
      },
      render: (_args, value) => renderJson(value)
    },
    async execute(args, exec) {
      const tree = objectValue(await runtime.request(`/api/projects/${encodeURIComponent(args.projectId)}/tree`, {}, exec.signal), "tree read");
      if (!Array.isArray(tree.nodes)) throw new Error("Design tree response is missing nodes");
      return {
        project: projectValue(tree.project, "tree read"),
        nodes: tree.nodes.map((value) => {
          const record = objectValue(value, "tree read");
          return {
            ...nodeValue(value, "tree read"),
            seq: integerValue(record, "seq", "tree read"),
            artifact_revision: stringValue(record, "artifact_revision", "tree read")
          };
        })
      };
    },
    presentCall: (args) => ({ card: "generic", title: "Read Design tree", kind: "read", rawInput: args })
  }));
  ctx.tools.register(defineTool({
    name: "design_node_add",
    description: "Add one child card with an explicit visual type. Use title for a compact hierarchy capsule, note for a taped text card, or an artifact card type for a rendered deliverable.",
    parameters: {
      projectId: { type: "string", required: true },
      parentId: { type: "string", required: true },
      title: { type: "string", required: true },
      position: { type: "integer" },
      cardType: { type: "string", required: true, enum: [...CARD_TYPES], description: "Visual card form. title is a compact capsule; note is a taped text card; the remaining values are rendered artifact cards." },
      content: { type: "string", description: "Required only for note cards. Keep it concise enough to scan directly on the canvas." },
      artifact: { type: "string", description: "Optional source for artifact cards. Omit it to create a visible generating placeholder." }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Created Design node ${value.id}. The integrated workspace updates automatically.` }]
    },
    async execute(args, exec) {
      const result = objectValue(await runtime.request(`/api/projects/${encodeURIComponent(args.projectId)}/nodes`, {
        method: "POST",
        body: jsonBody({
          parentId: args.parentId,
          title: args.title,
          ...args.position === void 0 ? {} : { position: args.position },
          ...cardFields(args)
        })
      }, exec.signal), "node creation");
      return { id: stringValue(result, "id", "node creation") };
    },
    presentCall: (args) => ({ card: "generic", title: args.title, kind: "edit", rawInput: args })
  }));
  ctx.tools.register(defineTool({
    name: "design_node_batch",
    description: "Atomically create up to 100 explicitly typed Design cards. Combine title capsules, note cards, and artifact cards to build a balanced, readable multi-level tree.",
    parameters: {
      projectId: { type: "string", required: true },
      nodes: {
        type: "array",
        required: true,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            key: { type: "string", required: true },
            parentId: { type: "string", description: "Existing parent node id." },
            parentKey: { type: "string", description: "Key of a preceding node in this batch." },
            title: { type: "string", required: true },
            position: { type: "integer" },
            cardType: { type: "string", required: true, enum: [...CARD_TYPES], description: "title capsule, note card, or rendered artifact card type." },
            content: { type: "string", description: "Required only for note cards." },
            artifact: { type: "string", description: "Optional source for artifact cards; omit for a generating placeholder." }
          }
        }
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          nodes: {
            type: "array",
            required: true,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                key: { type: "string", required: true },
                id: { type: "string", required: true }
              }
            }
          }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Created ${value.nodes.length} Design nodes. The integrated workspace updates automatically.` }]
    },
    async execute(args, exec) {
      const requestNodes = args.nodes.map((node) => ({
        key: node.key,
        ...node.parentId === void 0 ? {} : { parentId: node.parentId },
        ...node.parentKey === void 0 ? {} : { parentKey: node.parentKey },
        title: node.title,
        ...node.position === void 0 ? {} : { position: node.position },
        ...cardFields(node)
      }));
      const result = objectValue(await runtime.request(`/api/projects/${encodeURIComponent(args.projectId)}/nodes/batch`, {
        method: "POST",
        body: jsonBody({ nodes: requestNodes })
      }, exec.signal), "batch node creation");
      const responseNodes = result.nodes;
      if (!Array.isArray(responseNodes)) throw new Error("Design batch response is missing nodes");
      return {
        nodes: responseNodes.map((value) => {
          const node = objectValue(value, "batch node creation");
          return {
            key: stringValue(node, "key", "batch node creation"),
            id: stringValue(node, "id", "batch node creation")
          };
        })
      };
    },
    presentCall: (args) => ({ card: "generic", title: `Create ${args.nodes.length} Design nodes`, kind: "edit", rawInput: args.nodes })
  }));
  ctx.tools.register(defineTool({
    name: "design_node_complete",
    description: "Finish or replace a Design artifact placeholder with authored HTML, Markdown, SVG, image, video, or audio source.",
    parameters: {
      projectId: { type: "string", required: true },
      nodeId: { type: "string", required: true },
      artifactType: { type: "string", required: true, enum: [...ARTIFACT_TYPES] },
      artifact: { type: "string", required: true, description: "Artifact source. May contain executable markup or any media URL supported by the browser." },
      expectedUpdatedAt: { type: "string" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          nodeId: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Completed Design node ${value.nodeId}. The integrated workspace updates automatically.` }]
    },
    async execute(args, exec) {
      await runtime.request(`/api/nodes/${encodeURIComponent(args.nodeId)}/artifact`, {
        method: "PUT",
        body: jsonBody({
          artifactType: args.artifactType,
          artifact: args.artifact,
          ...args.expectedUpdatedAt === void 0 ? {} : { expectedUpdatedAt: args.expectedUpdatedAt }
        })
      }, exec.signal);
      return { ok: true, nodeId: args.nodeId };
    },
    presentCall: (args) => ({ card: "generic", title: `Complete ${args.artifactType} node`, kind: "edit", rawInput: { nodeId: args.nodeId } })
  }));
  ctx.tools.register(defineTool({
    name: "design_node_update",
    description: "Update a node title, inline text, parent, or position. Use a new child node instead when the revision is worth comparing.",
    parameters: {
      projectId: { type: "string", required: true },
      nodeId: { type: "string", required: true },
      title: { type: "string" },
      content: { oneOf: [{ type: "string" }, { type: "null" }] },
      parentId: { type: "string" },
      position: { type: "integer" },
      expectedUpdatedAt: { type: "string" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          node: { ...NODE_SCHEMA, required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Updated Design node ${value.node.id}. The integrated workspace updates automatically.` }]
    },
    async execute(args, exec) {
      const node = await runtime.request(`/api/nodes/${encodeURIComponent(args.nodeId)}`, {
        method: "PUT",
        body: jsonBody({
          ...args.title === void 0 ? {} : { title: args.title },
          ...args.content === void 0 ? {} : { content: args.content },
          ...args.parentId === void 0 ? {} : { parentId: args.parentId },
          ...args.position === void 0 ? {} : { position: args.position },
          ...args.expectedUpdatedAt === void 0 ? {} : { expectedUpdatedAt: args.expectedUpdatedAt }
        })
      }, exec.signal);
      return { node: nodeValue(node, "node update") };
    },
    presentCall: (args) => ({ card: "generic", title: "Update Design node", kind: "edit", rawInput: args })
  }));
  ctx.tools.register(defineTool({
    name: "design_settings",
    description: "Change the Design canvas theme or interface language. Use system to follow the current DSH theme or language. Open canvases update immediately.",
    parameters: {
      theme: { type: "string", enum: [...THEMES] },
      locale: { type: "string", enum: [...LOCALES] }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          theme: { type: "string", required: true, enum: [...THEMES] },
          locale: { type: "string", required: true, enum: [...LOCALES] }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Design settings updated (${value.theme}, ${value.locale}).` }]
    },
    async execute(args, exec) {
      if (args.theme !== void 0) {
        await runtime.request("/api/settings/theme", { method: "PUT", body: jsonBody({ theme: args.theme }) }, exec.signal);
      }
      if (args.locale !== void 0) {
        await runtime.request("/api/settings/locale", { method: "PUT", body: jsonBody({ locale: args.locale }) }, exec.signal);
      }
      const settings = objectValue(await runtime.request("/api/settings", {}, exec.signal), "settings read");
      return {
        theme: stringValue(settings, "theme", "settings read"),
        locale: stringValue(settings, "locale", "settings read")
      };
    },
    presentCall: (args) => ({ card: "generic", title: "Update Design settings", kind: "edit", rawInput: args })
  }));
}

// src/index.ts
var name = "design";
var inject = ["tools", "systemPrompt"];
async function apply(ctx, config = {}) {
  const runtime = new DesignRuntime(resolveConfig(config));
  const startup = await runtime.start();
  ctx.logger.info(`design: canvas ${startup.reused ? "reused" : "started"} at ${startup.url}`);
  ctx.effect(() => async () => runtime.stop(), "design.runtime");
  registerDesignTools(ctx, runtime);
}
export {
  Config,
  DesignRuntime,
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
