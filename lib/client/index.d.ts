import type { Context as ClientContext } from '@deepseek-ai/cordis';
export declare const inject: string[];
/**
 * Local stand-in for the host `ctx.slots` merge.
 *
 * The host (0.1.3-alpha.1) declares `slots` on the client Context through
 * @deepseek-ai/dsh-client-ui-renderer/client:
 *
 *   // Type-only: pulls the SlotRegistry service merge (ctx.slots).
 *   import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
 *
 * That package is not on the public registry yet (npm only has the
 * transitional 0.1.2-rc.1, which never gained ui-renderer), so this
 * intersection restores just the two members this plugin calls, mirroring the
 * harness SlotRegistry surface (register + inject, both disposers). Once
 * dsh-client-ui-renderer is installable, drop this type and add the
 * type-only import above instead.
 */
export type DesignClientContext = ClientContext & {
    slots: {
        /** Declare/register one entry into a slot; returns a disposer. */
        register(options: object, component?: unknown): () => void;
        /** Install a lazy slot declaration while live; returns a disposer. */
        inject(key: string, callback: () => () => void): () => void;
    };
};
/** Mount the native DSH sidebar action and frame-wide Design workspace. */
export declare function apply(ctx: DesignClientContext): void;
export { DesignSidebarAction, DesignWorkspaceOverlay } from './DesignSurface.js';
export { DesignProjectToolCard } from './DesignToolCard.js';
export { designWorkspaceOpen, setDesignWorkspaceOpen, subscribeDesignWorkspace, } from './store.js';
