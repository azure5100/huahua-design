import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  designWorkspaceOpen,
  designHostPreferences,
  designWorkspaceFrame,
  setDesignWorkspaceFrame,
  setDesignWorkspaceOpen,
  subscribeDesignWorkspace,
} from './store.js'
import { DesignBrandMark } from './DesignBrandMark.js'

const HUAHUA_DESIGN_URL = 'http://127.0.0.1:9531/'

/** Additive action rendered above Settings in the DSH sidebar. */
export function DesignSidebarAction({ wide }: { readonly wide: boolean }): ReactNode {
  return (
    <button
      type="button"
      className={`design-entry${wide ? '' : ' design-entry--rail'}`}
      aria-label="打开 Design 工作台"
      title={wide ? undefined : 'Design'}
      onClick={() => { setDesignWorkspaceOpen(true) }}
    >
      <DesignBrandMark size={20} />
      {wide ? <span className="design-entry__label">Design</span> : null}
    </button>
  )
}

function ExternalIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9.5 2.5h4v4M13.2 2.8 7.5 8.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8.7v3.1c0 .94-.76 1.7-1.7 1.7H4.2c-.94 0-1.7-.76-1.7-1.7V5.7c0-.94.76-1.7 1.7-1.7h3.1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />
    </svg>
  )
}

/** Frame-wide Design workspace hosted by the DSH shell overlay slot. */
export function DesignWorkspaceOverlay(): ReactNode {
  const open = useSyncExternalStore(subscribeDesignWorkspace, designWorkspaceOpen, designWorkspaceOpen)
  const preferences = useSyncExternalStore(subscribeDesignWorkspace, designHostPreferences, designHostPreferences)
  const [ready, setReady] = useState(false)

  const sendPreferences = (): void => {
    designWorkspaceFrame()?.postMessage({ type: 'design:dsh-preferences', version: 1, ...preferences }, 'http://127.0.0.1:9531')
  }

  useEffect(() => {
    if (!open) return
    setReady(false)
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setDesignWorkspaceOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown) }
  }, [open])

  useEffect(() => {
    if (!open) return
    sendPreferences()
  }, [open, preferences.locale, preferences.theme])

  useEffect(() => {
    if (!open) return
    const onMessage = (event: MessageEvent): void => {
      const value = event.data as Record<string, unknown> | null
      if (event.origin !== 'http://127.0.0.1:9531' || event.source !== designWorkspaceFrame()) return
      if (value?.type !== 'design:dsh-preferences-ready' || value.version !== 1) return
      sendPreferences()
    }
    window.addEventListener('message', onMessage)
    return () => { window.removeEventListener('message', onMessage) }
  }, [open, preferences.locale, preferences.theme])

  if (!open) return null
  return (
    <div className="design-layer" role="dialog" aria-modal="true" aria-labelledby="design-workspace-title">
      <section className="design-shell">
        <header className="design-bar">
          <div className="design-brand">
            <span className="design-brand__seal"><DesignBrandMark size={18} /></span>
            <strong className="design-brand__name" id="design-workspace-title">Design</strong>
            <span className="design-brand__meta">creative branching workspace</span>
          </div>
          <div className="design-status" aria-live="polite">
            <span className="design-status__dot" />
            {preferences.locale === 'en'
              ? (ready ? 'Workspace connected' : 'Waking workspace')
              : (ready ? '工作台已连接' : '正在唤醒工作台')}
          </div>
          <div className="design-actions">
            <a className="design-icon-button" href={HUAHUA_DESIGN_URL} target="_blank" rel="noreferrer" aria-label="在新窗口打开 Design" title="在新窗口打开">
              <ExternalIcon />
            </a>
            <button className="design-icon-button" type="button" aria-label="关闭 Design" title="关闭 (Esc)" onClick={() => { setDesignWorkspaceOpen(false) }}>
              <CloseIcon />
            </button>
          </div>
        </header>
        <div className="design-stage">
          {!ready ? (
            <div className="design-loading">
              <span><span className="design-loading__sprout"><DesignBrandMark size={30} /></span>{preferences.locale === 'en' ? 'Growing branches' : '枝叶正在展开'}</span>
            </div>
          ) : null}
          <iframe
            ref={(frame) => { setDesignWorkspaceFrame(frame?.contentWindow ?? null) }}
            className={`design-frame${ready ? ' design-frame--ready' : ''}`}
            src={HUAHUA_DESIGN_URL}
            title="Design 工作台"
            onLoad={() => { setReady(true); sendPreferences() }}
          />
        </div>
      </section>
    </div>
  )
}
