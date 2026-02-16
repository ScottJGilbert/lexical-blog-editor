# @scottjgilbert/lexical-blog-editor

<p float="left">
<img alt="NPM version" src="https://img.shields.io/npm/v/@scottjgilbert/lexical-blog-editor.svg?style=for-the-badge&labelColor=000000">
<img alt="License" src="https://img.shields.io/npm/l/@scottjgilbert/lexical-blog-editor.svg?style=for-the-badge&labelColor=000000">
</p>

# Lexical Blog Editor Documentation

A feature-rich, production-ready rich text editor designed for blog content management. Built on Meta's [Lexical](https://lexical.dev/) framework.

## Overview

A feature-rich, production-ready rich text editor and viewer for blog content, built on Meta's [Lexical](https://lexical.dev/) framework. This package provides a comprehensive editing experience with extensive plugin support, custom nodes, and a full-featured toolbar.

This editor is designed to be plug-and-play and is not customizable or designed for extensive configuration. It is intended to be used as a complete solution for blog content creation, with a focus on providing a wide range of features out of the box.

## Installation

```bash
npm install @scottjgilbert/lexical-blog-editor
# or
pnpm add @scottjgilbert/lexical-blog-editor
# or
yarn add @scottjgilbert/lexical-blog-editor
```

## Requirements

This package requires the following peer dependencies:

- Lexical 0.40.0 or higher
- React 18.0.0 or 19.0.0
- React DOM 18.0.0 or 19.0.0

## Supported Browsers

| Browser | Version |
| ------- | ------- |
| Chrome  | 49+     |
| Firefox | 52+     |
| Safari  | 11+     |
| Edge    | 79+     |

## Usage

### Basic Implementation

```tsx
import { useState } from "react";
import { Editor } from "@scottjgilbert/lexical-blog-editor";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/viewer";
import type { EditorState } from "@scottjgilbert/lexical-blog-editor";

import "@scottjgilbert/lexical-blog-editor/styles/ViewerTheme.css";

function MyBlogEditor() {
  const [savedState, setSavedState] = useState<string | null>(null);

  const handleChange = (editorState: EditorState) => {
    const json = JSON.stringify(editorState.toJSON());
    setSavedState(json);
  };

  return (
    <>
      <Editor
        onChange={handleChange}
        placeholder="Start writing your blog post..."
      />
      {savedState && <Viewer state={savedState} />}
    </>
  );
}
```

### With Initial Content

```tsx
import { Editor } from "@scottjgilbert/lexical-blog-editor";
import type { EditorState } from "@scottjgilbert/lexical-blog-editor";

function MyBlogEditor({ savedContent }: { savedContent?: EditorState }) {
  const handleChange = (editorState: EditorState, html: string) => {
    // Handle changes
  };

  return (
    <Editor
      initialState={savedContent}
      onChange={handleChange}
      placeholder="Continue writing..."
    />
  );
}
```

## API Reference

### Editor Component

#### Props

| Prop           | Type                                               | Default                | Description                                                                       |
| -------------- | -------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| `onChange`     | `(editorState: EditorState, html: string) => void` | **Required**           | Callback fired whenever the editor content changes                                |
| `placeholder`  | `string`                                           | `"Enter some text..."` | Placeholder text displayed when the editor is empty                               |
| `initialState` | `EditorState`                                      | `undefined`            | Initial editor content state. If not provided, displays a default welcome message |

### Viewer Component

Import from:

```tsx
import { Viewer } from "@scottjgilbert/lexical-blog-editor/viewer";
```

#### Props

| Prop       | Type                    | Default      | Description                                                                                               |
| ---------- | ----------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `state`    | `EditorState \| string` | **Required** | Serialized editor state string (from `JSON.stringify(editorState.toJSON())`) or an `EditorState` instance |
| `sanitize` | `boolean`               | `true`       | Sanitizes generated HTML with DOMPurify and an iframe allowlist for YouTube, Figma, and Twitter embeds    |

## Features

### Rich Text Editing

- **Text Formatting**: Bold, italic, underline, strikethrough, subscript, superscript, code
- **Headings**: H1 through H6
- **Text Alignment**: Left, center, right, justify
- **Font Sizes**: Adjustable text size
- **Text Color & Background**: Custom text and highlight colors
- **Lists**: Ordered lists, unordered lists, and checklist support
- **Quotes & Code Blocks**: Block quotes and syntax-highlighted code blocks
- **Indentation**: Tab indentation with nesting support (up to 7 levels)

### Content Blocks

- **Tables**: Fully-featured tables with cell merging, resizing, and hover actions
- **Images**: Upload and embed images with captions and resizing
- **Embeds**: YouTube videos, Twitter/X posts, Figma designs
- **Equations**: LaTeX/KaTeX mathematical equation support
- **Horizontal Rules**: Visual section dividers
- **Layouts**: Multi-column layouts with customizable containers
- **Collapsible Sections**: Expandable/collapsible content blocks
- **Date/Time**: Insert formatted date and time stamps

### Interactive Elements

- **Links**: Auto-detection, manual insertion, and inline editing
- **Hashtags**: Automatic #hashtag detection
- **Keywords**: Special keyword highlighting
- **Emojis**: Emoji picker with search and categories

### Advanced Features

- **Markdown Shortcuts**: Type Markdown syntax for quick formatting
- **Drag & Drop**: Drag and drop images, reorder blocks
- **Speech to Text**: Voice input support (browser-dependent)
- **Component Picker**: Slash commands (`/`) to quickly insert components
- **Floating Toolbars**: Context-aware formatting toolbars
- **Auto-linking**: Automatically converts URLs to clickable links
- **Syntax Highlighting**: Code blocks with Shiki-powered syntax highlighting for almost 200 languages
- **Undo/Redo**: Full history support with keyboard shortcuts
- **Keyboard Shortcuts**: Comprehensive keyboard shortcut system
- **Copy/Paste**: Smart paste handling with format preservation
- **Viewer**: Read-only rendering component with sanitization and embed handling

### Included Plugins/Extensions

<details>
<summary>View all (30+)</summary>

- ActionsPlugin
- AutoEmbedPlugin
- AutoFocusPlugin
- AutoLinkPlugin
- CheckListPlugin
- ClearEditorPlugin
- ClickableLinkPlugin
- CodeActionMenuPlugin
- CollapsiblePlugin
- ComponentPickerPlugin
- DateTimePlugin
- DragDropPastePlugin
- DraggableBlockPlugin
- EmojiPickerPlugin
- EmojisPlugin
- EquationsPlugin
- FigmaPlugin
- FloatingLinkEditorPlugin
- FloatingTextFormatToolbarPlugin
- HashtagPlugin
- HistoryPlugin
- HorizontalRulePlugin
- ImagesPlugin
- KeywordsPlugin
- LayoutPlugin
- LinkPlugin
- ListPlugin
- MarkdownShortcutPlugin
- RichTextPlugin
- ShortcutsPlugin
- SpeechToTextPlugin
- TabFocusPlugin
- TabIndentationPlugin
- TablePlugin (with cell resizing, merging, and hover actions)
- ToolbarPlugin
- TwitterPlugin
- YouTubePlugin

</details>

### Custom Nodes

<details>
<summary>The editor includes 20 custom node types:</summary>

- AutoLinkNode, LinkNode
- CodeNode, CodeHighlightNode
- CollapsibleContainerNode, CollapsibleContentNode, CollapsibleTitleNode
- DateTimeNode
- EmojiNode
- EquationNode
- FigmaNode
- HashtagNode
- HeadingNode, QuoteNode
- HorizontalRuleNode
- ImageNode
- KeywordNode
- LayoutContainerNode, LayoutItemNode
- ListNode, ListItemNode
- MarkNode
- OverflowNode
- SpecialTextNode
- TableNode, TableCellNode, TableRowNode
- TweetNode
- YouTubeNode

</details>

## Styling

See the [Styling Guide](./docs/styling.md) for details on editor and viewer styling. The viewer ships with two style bundles:

- `@scottjgilbert/lexical-blog-editor/styles/ViewerTheme.css`
- `@scottjgilbert/lexical-blog-editor/styles/ViewerThemeComplete.css`

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All exports are typed:

```tsx
import type { EditorProps } from "@scottjgilbert/lexical-blog-editor";
import type { EditorState } from "@scottjgilbert/lexical-blog-editor";
```

## Contributing

This is an open-source project. Contributions, issues, and feature requests are welcome!

## Acknowledgments

Built on top of Meta's [Lexical](https://lexical.dev/) framework. This package is a modified wrapper of the Lexical Playground editor, tailored specifically for blog content creation.

## License

MIT
