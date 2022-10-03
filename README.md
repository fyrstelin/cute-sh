# Cute Sh

No more troubles running simple bash scripts from node. Simple as awaiting a script:

```js
import { $ } from 'cute-sh'

await $`echo -n hello world` // returns "hello world"
```

It handles arguments:

```js
const someUrl = 'http://example.com'
await $`wget ${someUrl}` // will execute 'ẁget "http://example.com"'
```

It handles nested template
```js
const input = 'http://example.com'

const outputs = [{
  res: 720,
  kbps: '6000k',
  fps: 30,
  file: '720p.mp4'
}, {
  res: 420,
  kbps: '2000k',
  fps: 20,
  file: '480p.mp4'
}]

await $`ffmpeg 
  -i ${input}

  ${outputs.map(({ res, kbps }) => $`
    -vf ${`scale=-2:${res}`}
    -maxrate ${kbps}
    -r ${format.fps}
    -preset veryfast
    ${files.scaled}
  `)}
`
```
If the map just return an array, every entry would be escaped. By returning a sh template, it tells sh that it already have been escaped. Further the `scale=-2...` needs to be a string, since it is one string that ffmpeg parses.

Last but not least sh returns a ReadWriteStream, which you can integrate with you existing streams or pipe to a new sh:

```js
await finished(
  $`echo hello world`
    .pipe(sh'wc -c`)
    .pipe(createWriteStream('myfile'))
)
```

## Environment
By default cute-sh passes an empty environment to the child process. You can pass an environment using the `.with` operator:

```js
await $`printenv`.with({
  hello: 'world'
})
```

## Current Working Directory
You can set the current working directory with `.in`:

```js
await $`ls`.in('some-folder')
```
