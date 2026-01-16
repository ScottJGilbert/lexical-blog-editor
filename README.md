# @scottjgilbert/lexical-blog-editor

<img alt="NPM version" src="https://img.shields.io/npm/v/@scottjgilbert/lexical-blog-editor.svg?style=for-the-badge&labelColor=000000">
<img alt="License" src="https://img.shields.io/npm/l/@scottjgilbert/lexical-blog-editor.svg?style=for-the-badge&labelColor=000000">

A feature-rich, production-ready rich text editor for blog content, built on Meta's [Lexical](https://lexical.dev/) framework. This package provides a comprehensive editing experience with extensive plugin support, custom nodes, and a full-featured toolbar.

> ⚠️ **Note**: This package is currently in beta. A rendering component for displaying saved content as DOM is under active development.

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

- React 18.0.0 or higher
- React DOM 18.0.0 or higher
- Lexical 0.39.0 or higher

## Usage

### Basic Implementation

```tsx
import { Editor } from "@scottjgilbert/lexical-blog-editor";
import type { EditorState } from "lexical";

function MyBlogEditor() {
  const handleChange = (editorState: EditorState) => {
    // Access and serialize the editor state
    editorState.read(() => {
      const json = JSON.stringify(editorState.toJSON());
      console.log("Editor content:", json);
      // Save to your database, state management, etc.
    });
  };

  return (
    <Editor
      onChange={handleChange}
      placeholder="Start writing your blog post..."
    />
  );
}
```

### With Initial Content

```tsx
import { Editor } from "@scottjgilbert/lexical-blog-editor";
import type { EditorState } from "lexical";

function MyBlogEditor({ savedContent }: { savedContent?: EditorState }) {
  const handleChange = (editorState: EditorState) => {
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

| Prop           | Type                                 | Default                | Description                                                                       |
| -------------- | ------------------------------------ | ---------------------- | --------------------------------------------------------------------------------- |
| `onChange`     | `(editorState: EditorState) => void` | **Required**           | Callback fired whenever the editor content changes                                |
| `placeholder`  | `string`                             | `"Enter some text..."` | Placeholder text displayed when the editor is empty                               |
| `initialState` | `EditorState`                        | `undefined`            | Initial editor content state. If not provided, displays a default welcome message |

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
- **Page Breaks**: Print-friendly page break markers
- **Layouts**: Multi-column layouts with customizable containers
- **Collapsible Sections**: Expandable/collapsible content blocks
- **Date/Time**: Insert formatted date and time stamps

### Interactive Elements

- **Links**: Auto-detection, manual insertion, and inline editing
- **Mentions**: @mention support with autocomplete
- **Hashtags**: Automatic #hashtag detection
- **Keywords**: Special keyword highlighting
- **Emojis**: Emoji picker with search and categories
- **Polls**: Interactive poll creation (visual component)

### Advanced Features

- **Markdown Shortcuts**: Type Markdown syntax for quick formatting
- **Drag & Drop**: Drag and drop images, reorder blocks
- **Speech to Text**: Voice input support (browser-dependent)
- **Component Picker**: Slash commands (`/`) to quickly insert components
- **Floating Toolbars**: Context-aware formatting toolbars
- **Auto-linking**: Automatically converts URLs to clickable links
- **Syntax Highlighting**: Code blocks with Shiki-powered syntax highlighting
- **Undo/Redo**: Full history support with keyboard shortcuts
- **Keyboard Shortcuts**: Comprehensive keyboard shortcut system
- **Copy/Paste**: Smart paste handling with format preservation

### Included Plugins

<details>
<summary>View all plugins (40+)</summary>

- ActionsPlugin
- AutoEmbedPlugin
- AutoFocusPlugin
- AutoLinkPlugin
- CheckListPlugin
- ClearEditorPlugin
- ClickableLinkPlugin
- CodeActionMenuPlugin
- CodeHighlightShikiPlugin
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
- MentionsPlugin
- PageBreakPlugin
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

The editor includes over 25 custom node types:

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
- MentionNode
- OverflowNode
- PageBreakNode
- PollNode
- SpecialTextNode
- TableNode, TableCellNode, TableRowNode
- TweetNode
- YouTubeNode

## Styling

The package includes built-in CSS that will be automatically imported. The editor uses CSS classes that can be customized:

```tsx
// The editor includes its own styles
import { Editor } from "@scottjgilbert/lexical-blog-editor";
// Styles are automatically applied
```

### Key CSS Classes

- `.full-blog-editor-wrapper` - Outermost wrapper
- `.editor-container` - Main editor container
- `.editor-scroller` - Scrollable editor area
- `.editor` - ContentEditable wrapper
- Various node-specific classes for custom styling

You can override these classes in your own CSS to customize the appearance.

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All exports are typed:

```tsx
import type { EditorProps } from "@scottjgilbert/lexical-blog-editor";
import type { EditorState } from "@scottjgilbert/lexical-blog-editor";
```

## Roadmap

- [ ] **Viewer Component**: Dedicated component for rendering saved EditorState as read-only DOM content
- [ ] **Server-Side Rendering**: Enhanced SSR support

## Browser Support

The editor supports all modern browsers:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Contributing

This is an open-source project. Contributions, issues, and feature requests are welcome!

## Acknowledgments

Built on top of Meta's [Lexical](https://lexical.dev/) framework. This package is a wrapper of a modified version of the Lexical Playground editor, tailored specifically for blog content creation.

## License

MIT
