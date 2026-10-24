import { describe, expect, it, vi } from 'vitest'
import {
  designWorkspaceOpen,
  setDesignWorkspaceOpen,
  subscribeDesignWorkspace,
} from '../src/client/store.js'
import { shouldAutoOpenDesignProject } from '../src/client/DesignToolCard.js'

describe('Design client workspace store', () => {
  it('shares visibility between the sidebar action and overlay', () => {
    setDesignWorkspaceOpen(false)
    const listener = vi.fn()
    const dispose = subscribeDesignWorkspace(listener)

    setDesignWorkspaceOpen(true)
    expect(designWorkspaceOpen()).toBe(true)
    expect(listener).toHaveBeenCalledOnce()

    setDesignWorkspaceOpen(true)
    expect(listener).toHaveBeenCalledOnce()

    dispose()
    setDesignWorkspaceOpen(false)
    expect(designWorkspaceOpen()).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
  })
})

describe('Design project tool card', () => {
  it('opens only after a live create call succeeds', () => {
    expect(shouldAutoOpenDesignProject(true, true, false)).toBe(true)
    expect(shouldAutoOpenDesignProject(false, true, false)).toBe(false)
    expect(shouldAutoOpenDesignProject(true, false, false)).toBe(false)
    expect(shouldAutoOpenDesignProject(true, true, true)).toBe(false)
  })
})
