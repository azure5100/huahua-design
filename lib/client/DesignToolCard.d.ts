import { type ReactNode } from 'react';
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client';
export declare function shouldAutoOpenDesignProject(wasRunning: boolean, settled: boolean, failed: boolean): boolean;
/** Native DSH result row for a newly created Design project. */
export declare function DesignProjectToolCard({ block }: ToolCallViewProps): ReactNode;
