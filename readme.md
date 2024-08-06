# editorjs-color
editorjs plugin to provide color palette functionality

## Install

```bash
npm install editorjs-color --save
```

## Usage

```js
import EditorJS from '@editorjs/editorjs';
import Color, { Config } from 'editorjs-color';
import "editorjs-color/style.css";

const editor = new EditorJS({
  holder: 'editorjs',
  tools: {
    color: {
      class: Color,
      config: {
        frontColors: ['#ff0000', '#00ff00', '#0000ff'], // front colors list
        backgroundColors: ['#ff0000', '#00ff00', '#0000ff'], // background colors list
      } satisfies Config,
    },
  },
});
```

## License

MIT