import { createWriteStream } from 'fs'
import { mkdir, readFile, stat, unlink } from 'fs/promises'
import { join } from 'path'
import { finished } from 'stream/promises'
import { it, describe, expect, beforeAll } from 'vitest'
import { $ } from '.'

describe('sh', () => {
  beforeAll(async () => {
    await mkdir('test-data', {
      recursive: true
    })
  })

  const file = (...path: string[]) => join('test-data', ...path)

  it('should be lazy', async () => {
    await unlink('file').catch(() => null)
    $`touch file`
    expect(() => stat('file')).rejects.toThrow()
  })

  it('should execute command', async () => {
    const result = await $`echo -n hello`

    expect(result).toBe('hello')
  })


  it('should not trim command', async () => {
    const result = await $`echo -n "  hello  "`

    expect(result).toBe('  hello  ')
  })

  it('should accept args', async () => {
    const result = await $`echo -n ${'hello world'}`
    expect(result).toBe('hello world')
  })

  it('should escape args', async () => {
    const result = await $`echo -n ${'Hello "Mr White"'}`
    expect(result).toBe('Hello "Mr White"')
  })

  it('should allow inner sh', async () => {
    const result = await $`echo -n ${$`Hello ${'world of "sh"'}`}`
    expect(result).toBe('Hello world of "sh"')
  })

  it('should allow array', async () => {
    const result = await $`echo -n ${['Hello', 'world']}`
    expect(result).toBe('Hello world')
  })

  it('should stream output', async () => {
    const res = await new Promise<string>(r => {
      const chunks = [] as Buffer[]
      $`echo hello`
        .on('data', d => chunks.push(d))
        .on('end', () => r(Buffer.concat(chunks).toString().trim()))
    })

    expect(res).toBe('hello')
  })

  it('should pipe', async () => {
    const result = await $`echo -n hello`
      .pipe($`wc -c`)
      .pipe($`cat`)
    expect(result).toBe('5\n')
  }, 1000)

  it('should handle error when awaiting', async () => {
    await expect(() => $`top`).rejects.toThrow()
  })

  it('should handle error when streaming', async () => {
    let error = null
    await new Promise<void>(r => {
      $`top`
        .on('error', e => {
          error = e
        })
        .on('close', r)
    })

    expect(error).toBeDefined()
  })

  it('should pipe to existing streams', async () => {
    await finished(
      $`echo hello world`.pipe(
        $`wc -c`
      ).pipe(
        createWriteStream(file('word-count'))
      )
    );

    expect((await readFile(file('word-count'))).toString('utf8')).toBe('12\n')
  })

  it('should execute in other folder', async () => {
    expect(await $`ls index.ts`.in('src')).toBe('index.ts\n')
  })

  it('should use empty environment', async () => {
    expect(await $`printenv`).toBe('')
  })

  it('should pass environment', async () => {
    expect(await $`printenv`.with({
      hello: 'world'
    })).toBe('hello=world\n')
  })

  it('should override environment', async () => {
    expect(await $`printenv`
      .with({
        hello: 'world',
        something: 'else'
      })
      .with({
        hello: 'moon'
      })
    ).toBe('hello=moon\n')
  })
})
