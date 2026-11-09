/*
 * Copyright CIB software GmbH and/or licensed to CIB software GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership. CIB software licenses this file to you under the Apache License,
 * Version 2.0; you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import monacoDompurify, { MONACO_DOMPURIFY_IMPORT, MONACO_DOMPURIFY_IMPORTER } from '../../../build/monacoDompurify.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const monacoImporter = `/app/node_modules/${MONACO_DOMPURIFY_IMPORTER}`

function setup(root = '/app') {
  const plugin = monacoDompurify()
  plugin.configResolved({ root })
  const ctx = { resolve: vi.fn().mockResolvedValue({ id: '/app/node_modules/dompurify/dist/purify.es.mjs' }) }
  return { plugin, ctx, resolveId: (source, importer) => plugin.resolveId.call(ctx, source, importer, { ssr: false }) }
}

describe('monacoDompurify', () => {
  it('runs before the other resolvers', () => {
    expect(monacoDompurify()).toMatchObject({ name: 'monaco-dompurify', enforce: 'pre' })
  })

  it('resolves monaco\'s bundled DOMPurify to the dompurify package from the project root', async () => {
    const { ctx, resolveId } = setup()
    const result = await resolveId(MONACO_DOMPURIFY_IMPORT, monacoImporter)
    expect(result).toEqual({ id: '/app/node_modules/dompurify/dist/purify.es.mjs' })
    expect(ctx.resolve).toHaveBeenCalledWith('dompurify', path.join('/app', 'package.json'), { ssr: false, skipSelf: true })
  })

  it('also matches Windows importer paths', async () => {
    const { ctx, resolveId } = setup('C:\\app')
    await resolveId(MONACO_DOMPURIFY_IMPORT, `C:\\app\\node_modules\\${MONACO_DOMPURIFY_IMPORTER.replaceAll('/', '\\')}`)
    expect(ctx.resolve).toHaveBeenCalledWith('dompurify', path.join('C:\\app', 'package.json'), expect.anything())
  })

  it.each([
    ['another monaco module', MONACO_DOMPURIFY_IMPORT, '/app/node_modules/monaco-editor/esm/vs/base/browser/markdownRenderer.js'],
    ['an app module', MONACO_DOMPURIFY_IMPORT, '/app/src/components/Editor.js'],
    ['another import of domSanitize', './dom.js', monacoImporter],
    ['an entry module', MONACO_DOMPURIFY_IMPORT, undefined],
  ])('leaves %s alone', async (_, source, importer) => {
    const { ctx, resolveId } = setup()
    expect(await resolveId(source, importer)).toBeNull()
    expect(ctx.resolve).not.toHaveBeenCalled()
  })

  it('still matches the import in the installed monaco-editor', () => {
    const domSanitize = fs.readFileSync(path.join(repoRoot, 'node_modules', MONACO_DOMPURIFY_IMPORTER), 'utf-8')
    expect(domSanitize).toContain(`from '${MONACO_DOMPURIFY_IMPORT}'`)
  })

  it('makes monaco sanitize markdown HTML with the dompurify package', async () => {
    const { default: dompurify } = await import('dompurify')
    const sanitize = vi.spyOn(dompurify, 'sanitize')
    const { sanitizeHtml } = await import('monaco-editor/esm/vs/base/browser/domSanitize.js')

    const html = sanitizeHtml('<p>ok</p><img src="x" onerror="alert(1)"><script>alert(2)</script>').toString()

    expect(sanitize).toHaveBeenCalled()
    expect(html).toContain('<p>ok</p>')
    expect(html).not.toMatch(/onerror|<script/)
    sanitize.mockRestore()
  })

  it('bundles the dompurify version declared in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'))
    const installed = JSON.parse(fs.readFileSync(path.join(repoRoot, 'node_modules/dompurify/package.json'), 'utf-8'))
    expect(pkg.devDependencies.dompurify).toBe(installed.version)
  })
})
