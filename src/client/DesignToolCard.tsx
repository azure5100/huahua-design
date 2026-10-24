import { useEffect, useRef, type ReactNode } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { setDesignWorkspaceOpen } from './store.js'
import { DesignBrandMark } from './DesignBrandMark.js'

export function shouldAutoOpenDesignProject(wasRunning: boolean, settled: boolean, failed: boolean): boolean {
  return wasRunning && settled && !failed
}

/** Native DSH result row for a newly created Design project. */
export function DesignProjectToolCard({ block }: ToolCallViewProps): ReactNode {
  const settled = 'kind' in block
  const failed = settled && block.isError
  const wasRunning = useRef(!settled)

  useEffect(() => {
    if (!settled) {
      wasRunning.current = true
      return
    }
    // Only a call observed transitioning on this page may open the workspace.
    // Historical settled cards never pop the surface open after page reload.
    if (shouldAutoOpenDesignProject(wasRunning.current, settled, failed)) {
      wasRunning.current = false
      setDesignWorkspaceOpen(true)
    } else if (settled) {
      wasRunning.current = false
    }
  }, [failed, settled])

  return (
    <div className="design-tool" data-state={failed ? 'error' : settled ? 'done' : 'running'}>
      <span className="design-tool__seal" aria-hidden="true">
        <DesignBrandMark size={20} />
      </span>
      <span className="design-tool__copy">
        <strong>{failed ? 'Design 项目创建失败' : settled ? 'Design 项目已就绪' : '正在创建 Design 项目'}</strong>
        <small>{failed ? '展开轨迹查看错误' : settled ? '项目已同步到内置工作台' : '正在准备根节点与画布'}</small>
      </span>
      <button
        className="design-tool__open"
        type="button"
        disabled={failed}
        onClick={() => { setDesignWorkspaceOpen(true) }}
      >
        打开 Design
        <span aria-hidden="true">↗</span>
      </button>
      {!settled ? <span className="design-tool__sweep" aria-hidden="true" /> : null}
    </div>
  )
}
