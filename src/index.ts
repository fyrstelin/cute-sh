import { parseArgsStringToArgv } from 'string-argv'
import { spawn } from 'child_process'
import { Lazy } from './Lazy'
import duplexer2 = require('duplexer2')

type Args = string | number | undefined | Sh | ReadonlyArray<Args>

type Sh = {
  args: ReadonlyArray<string>
  toString(): string
  in: (cwd: string) => Sh
  with: (env: NodeJS.ProcessEnv) => Sh
} & NodeJS.ReadWriteStream & Promise<string>

const parse = (args: Args): ReadonlyArray<string> => {
  if (args === undefined) {
    return []
  }

  if (typeof args === 'string') {
    return [args]
  }

  if (typeof args === 'number') {
    return [args.toString()]
  }

  if (Array.isArray(args)) {
    return args.flatMap(parse)
  }

  return (args as Sh).args
}

type ShOptions = {
  cwd?: string
  env: {}
}

const Sh = (
  template: TemplateStringsArray,
  templateArgs: ReadonlyArray<Args>,
  options: ShOptions = {
    env: {}
  }
): Sh => {
  const args = template.reduce(
    (acc, next, i) => {
      acc.push(...parseArgsStringToArgv(next))
      acc.push(...parse(templateArgs[i]))
      return acc
    },
    [] as string[]
  )

  const stream = Lazy({}, () => {
    const [command, ...argsv] = args

    const p = spawn(command, argsv, {
      stdio: 'pipe',
      cwd: options.cwd,
      env: options.env
    })

    const buffers = [] as Buffer[]
    p.stderr.on('data', data => buffers.push(data))

    const stream = duplexer2({
    },p.stdin, p.stdout)

    p.on('close', () => {
      if (p.exitCode) {
        stream.emit('error', new Error(Buffer.concat(buffers).toString().trim()))
      }
      stream.emit('close')
      stream.end()
    })

    return Lazy(stream, () => new Promise<string>((resolve, reject) => {
      const buffers: Buffer[] = []

      stream
        .on('data', (chunk: Buffer) => buffers.push(chunk))
        .on('error', reject)
        .on('close', () => resolve(Buffer.concat(buffers).toString('utf-8')))
    }))
  })

  return Lazy({
    args,
    in: (cwd: string) => Sh(template, templateArgs, {
      ...options,
      cwd
    }),
    with: (env: NodeJS.ProcessEnv) => Sh(template, templateArgs, {
      ...options,
      env
    }),
    toString: () => args
      .map((arg, i) => i === 0 ? arg : `"${arg.replace(/(")/g, '\\$1')}"`)
      .join(' ')
  }, () => stream)
}

export const $ = (
  template: TemplateStringsArray,
  ...templateArgs: ReadonlyArray<Args>
): Sh => Sh(template, templateArgs)
