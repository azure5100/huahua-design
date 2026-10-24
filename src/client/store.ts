const listeners = new Set<() => void>()
let open = false
let workspaceFrame: Window | null = null
let hostPreferences = { locale: 'zh-CN' as 'zh-CN' | 'en', theme: 'light' as 'light' | 'dark' }

/** Current visibility of the frame-wide Design workspace. */
export function designWorkspaceOpen(): boolean {
  return open
}

/** Subscribe one React external-store listener. */
export function subscribeDesignWorkspace(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Open or close the shared workspace surface. */
export function setDesignWorkspaceOpen(next: boolean): void {
  if (open === next) return
  open = next
  for (const listener of listeners) listener()
}

/** Track the exact embedded Design window accepted by the session bridge. */
export function setDesignWorkspaceFrame(frame: Window | null): void {
  workspaceFrame = frame
}

/** Exact iframe source used to reject messages from unrelated loopback pages. */
export function designWorkspaceFrame(): Window | null {
  return workspaceFrame
}

/** Current DSH presentation preferences forwarded to the embedded canvas. */
export function designHostPreferences(): typeof hostPreferences {
  return hostPreferences
}

/** Publish a native DSH locale/theme snapshot to React and the iframe bridge. */
export function setDesignHostPreferences(next: typeof hostPreferences): void {
  if (hostPreferences.locale === next.locale && hostPreferences.theme === next.theme) return
  hostPreferences = next
  for (const listener of listeners) listener()
}
