# lexical-blog-editor

Prebuilt components for editing and rendering rich blog content with Lexical.

## Installation

```bash
npm install lexical-blog-editor
```

## Peer Dependencies

This package requires the following peer dependencies:

- `react` >= 18.0.0
- `react-dom` >= 18.0.0

## Usage

### Editor Component

The Editor component provides a rich text editor powered by Lexical.

```tsx
import { Editor } from 'lexical-blog-editor/editor';
import { EditorState } from 'lexical';

function MyEditor() {
  const handleChange = (editorState: EditorState) => {
    // Handle editor state changes
    editorState.read(() => {
      // Read the contents of the EditorState here
      const root = $getRoot();
      console.log(root);
    });
  };

  return (
    <Editor
      onChange={handleChange}
      placeholder="Start writing..."
    />
  );
}
```

#### Editor Props

- `onChange?: (editorState: EditorState) => void` - Callback fired when editor content changes
- `initialContent?: string` - Initial editor content as a serialized EditorState
- `placeholder?: string` - Placeholder text when editor is empty (default: "Enter some text...")
- `editorState?: string` - Controlled editor state as a serialized EditorState

### Viewer Component

The Viewer component renders read-only rich text content.

```tsx
import { Viewer } from 'lexical-blog-editor/viewer';

function MyViewer({ content }: { content: string }) {
  return <Viewer content={content} />;
}
```

#### Viewer Props

- `content: string` - Content to display as a serialized EditorState

## Features

Both components support:

- Rich text formatting (bold, italic, underline, strikethrough, code)
- Headings (h1-h6)
- Lists (ordered and unordered)
- Quotes
- Links
- Code blocks

## TypeScript Support

This package includes TypeScript type definitions out of the box. Import types from the respective component paths:

```tsx
import type { EditorProps } from 'lexical-blog-editor/editor';
import type { ViewerProps } from 'lexical-blog-editor/viewer';
```

## Styling

The components include basic CSS class names that you can style:

### Editor Classes
- `.editor-container` - Main editor container
- `.editor-input` - ContentEditable element
- `.editor-placeholder` - Placeholder text
- `.editor-paragraph`, `.editor-heading-h1`, etc. - Text styling classes

### Viewer Classes
- `.viewer-container` - Main viewer container
- `.viewer-content` - Content display element
- `.viewer-paragraph`, `.viewer-heading-h1`, etc. - Text styling classes

## License

ISC

