/** DeepSeek Harness plugin entry for the Design creative branching canvas. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { Config, type Config as ConfigShape, resolveConfig } from './config.js'
import { DesignRuntime } from './runtime.js'
import { registerDesignTools } from './tools.js'

export const name = 'design'
export const inject = ['tools', 'systemPrompt']
export { Config }
export type { ConfigShape as DesignConfig }
export { DesignRuntime } from './runtime.js'

/** Start the canvas and register Design's model-facing tools. */
export async function apply(ctx: Context, config: ConfigShape = {}): Promise<void> {
  const runtime = new DesignRuntime(resolveConfig(config))
  const startup = await runtime.start()
  ctx.logger.info(`design: canvas ${startup.reused ? 'reused' : 'started'} at ${startup.url}`)
  ctx.effect(() => async () => runtime.stop(), 'design.runtime')
  registerDesignTools(ctx, runtime)
}
