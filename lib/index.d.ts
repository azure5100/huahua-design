/** DeepSeek Harness plugin entry for the Design creative branching canvas. */
import type { Context } from '@deepseek-ai/cordis';
import { Config, type Config as ConfigShape } from './config.js';
export declare const name = "design";
export declare const inject: string[];
export { Config };
export type { ConfigShape as DesignConfig };
export { DesignRuntime } from './runtime.js';
/** Start the canvas and register Design's model-facing tools. */
export declare function apply(ctx: Context, config?: ConfigShape): Promise<void>;
