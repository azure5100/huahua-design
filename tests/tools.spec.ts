import type { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { describe, expect, it, vi } from 'vitest'
import type { DesignRuntime } from '../src/runtime.js'
import { registerDesignTools } from '../src/tools.js'

function harness() {
  const tools: ToolDefinition[] = []
  const sections: Array<{ name: string; order: number; text: string }> = []
  const ctx = {
    tools: {
      register(tool: ToolDefinition) {
        tools.push(tool)
        return () => undefined
      },
    },
    systemPrompt: {
      section(section: { name: string; order: number; text: string }) {
        sections.push(section)
        return () => undefined
      },
    },
  } as unknown as Context
  return { ctx, tools, sections }
}

describe('Design tools', () => {
  it('registers the complete native tool surface and workflow guidance', () => {
    const { ctx, tools, sections } = harness()
    registerDesignTools(ctx, {} as DesignRuntime)
    expect(tools.map(tool => tool.name)).toEqual([
      'design_start',
      'design_project_create',
      'design_project_list',
      'design_project_tree',
      'design_node_add',
      'design_node_batch',
      'design_node_complete',
      'design_node_update',
      'design_settings',
    ])
    expect(sections).toHaveLength(1)
    expect(sections[0]?.name).toBe('tool:design')
    expect(sections[0]?.text).toContain('multiple creative directions')
    expect(sections[0]?.text).toContain('Use title cards')
    expect(sections[0]?.text).toContain('Use note cards')

    const add = tools.find(tool => tool.name === 'design_node_add')
    const parameters = add?.parameters as { required?: string[]; properties?: { cardType?: { enum?: string[] } } }
    const cardType = parameters.properties?.cardType
    expect(parameters.required).toContain('cardType')
    expect(cardType?.enum).toEqual(['title', 'note', 'html', 'markdown', 'svg', 'image', 'video', 'audio'])
  })

  it('maps project creation to the local API without exposing the loopback service URL', async () => {
    const { ctx, tools } = harness()
    const request = vi.fn().mockResolvedValue({
      id: 'project-1',
      rootId: 'root-1',
      title: 'Three directions',
      prompt: 'Explore three directions',
      created_at: '2026-08-14T00:00:00.000Z',
      updated_at: '2026-08-14T00:00:00.000Z',
    })
    const runtime = { request } as unknown as DesignRuntime
    registerDesignTools(ctx, runtime)
    const tool = tools.find(candidate => candidate.name === 'design_project_create')
    const result = await tool?.execute(
      { prompt: 'Explore three directions', title: 'Three directions' },
      { signal: new AbortController().signal } as never,
    )
    expect(result).toEqual({
      projectId: 'project-1',
      rootId: 'root-1',
      title: 'Three directions',
    })
    expect(request).toHaveBeenCalledWith('/api/projects', expect.objectContaining({ method: 'POST' }), expect.any(AbortSignal))
  })

  it('maps explicit title, note, and artifact card types to the node API', async () => {
    const { ctx, tools } = harness()
    const request = vi.fn().mockResolvedValue({ id: 'node-1' })
    registerDesignTools(ctx, { request } as unknown as DesignRuntime)
    const tool = tools.find(candidate => candidate.name === 'design_node_add')
    const signal = new AbortController().signal

    await tool?.execute({ projectId: 'p', parentId: 'root', title: 'Round 2', cardType: 'title' }, { signal } as never)
    await tool?.execute({ projectId: 'p', parentId: 'root', title: 'Insight', cardType: 'note', content: 'Keep the hierarchy shallow.' }, { signal } as never)
    await tool?.execute({ projectId: 'p', parentId: 'root', title: 'Landing page', cardType: 'html' }, { signal } as never)

    const bodies = request.mock.calls.map((call) => JSON.parse(call[1].body as string))
    expect(bodies).toEqual([
      { parentId: 'root', title: 'Round 2' },
      { parentId: 'root', title: 'Insight', content: 'Keep the hierarchy shallow.' },
      { parentId: 'root', title: 'Landing page', artifactType: 'html' },
    ])
  })

  it('rejects invalid content for explicit card types', async () => {
    const { ctx, tools } = harness()
    registerDesignTools(ctx, { request: vi.fn() } as unknown as DesignRuntime)
    const tool = tools.find(candidate => candidate.name === 'design_node_add')
    const exec = { signal: new AbortController().signal } as never

    await expect(tool?.execute({ projectId: 'p', parentId: 'root', title: 'Empty', cardType: 'note' }, exec)).rejects.toThrow('note cards require non-empty content')
    await expect(tool?.execute({ projectId: 'p', parentId: 'root', title: 'Wrong', cardType: 'title', content: 'No body' }, exec)).rejects.toThrow('title cards accept only a title')
  })
})
