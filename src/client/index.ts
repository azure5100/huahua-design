import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { DesignSidebarAction, DesignWorkspaceOverlay } from './DesignSurface.js'
import { DesignProjectToolCard } from './DesignToolCard.js'
import { DesignSessionBridge } from './DesignSessionBridge.js'
import { installDesignStyles } from './styles.js'
import { setDesignHostPreferences } from './store.js'

export const inject = ['slots', 'locale', 'theme']

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
    register(options: object, component?: unknown): () => void
    /** Install a lazy slot declaration while live; returns a disposer. */
    inject(key: string, callback: () => () => void): () => void
  }
}

/** Mount the native DSH sidebar action and frame-wide Design workspace. */
export function apply(ctx: DesignClientContext): void {
  ctx.effect(() => installDesignStyles(), 'design: client styles')

  const syncHostPreferences = (): void => {
    setDesignHostPreferences({
      locale: ctx.locale.getLocale().active === 'en' ? 'en' : 'zh-CN',
      theme: ctx.theme.getTheme().active.colorScheme,
    })
  }
  syncHostPreferences()
  ctx.effect(() => {
    const offLocale = ctx.on('locale/change', syncHostPreferences)
    const offTheme = ctx.on('theme/change', syncHostPreferences)
    return () => { offLocale(); offTheme() }
  }, 'design: follow DSH locale and theme')

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'design',
    order: -10,
    label: 'Design',
  }, DesignSidebarAction))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'design-workspace',
    order: 20,
    label: 'Design workspace',
  }, DesignWorkspaceOverlay))

  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'design_project_create',
  }, DesignProjectToolCard))

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'design-session-bridge',
  }, DesignSessionBridge))
}

export { DesignSidebarAction, DesignWorkspaceOverlay } from './DesignSurface.js'
export { DesignProjectToolCard } from './DesignToolCard.js'
export {
  designWorkspaceOpen,
  setDesignWorkspaceOpen,
  subscribeDesignWorkspace,
} from './store.js'
