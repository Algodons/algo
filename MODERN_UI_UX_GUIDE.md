# Modern UI/UX Implementation Guide

This document describes the modern UI/UX components and features implemented in the Algo IDE frontend.

## Overview

The implementation includes a comprehensive set of modern UI components built with:
- **React 18** - Core UI framework
- **Next.js 15** - App router and server components
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations and transitions
- **Glassmorphism** - Modern translucent design aesthetic

## Key Features

### 1. Theme System

**Location:** `frontend/src/lib/hooks/use-theme.tsx`

A complete dark/light theme system with system preference detection.

**Features:**
- Dark mode (default)
- Light mode
- System preference detection
- Persistent theme selection
- Smooth theme transitions

**Usage:**
```tsx
import { useTheme } from '@/lib/hooks/use-theme'

function MyComponent() {
  const { theme, setTheme } = useTheme()
  
  return (
    <button onClick={() => setTheme('dark')}>
      Dark Mode
    </button>
  )
}
```

### 2. Command Palette

**Location:** `frontend/src/components/modern-ui/command-palette.tsx`

A searchable command palette for quick actions and navigation.

**Features:**
- Opens with `Cmd/Ctrl + K`
- Quick actions (New File, Open Terminal, etc.)
- View switching
- Theme switching
- Glassmorphism styling

**Keyboard Shortcut:** `Ctrl/Cmd + K`

### 3. Collapsible Sidebar

**Location:** `frontend/src/components/modern-ui/collapsible-sidebar.tsx`

An animated sidebar with full and icon-only modes.

**Features:**
- Full expanded mode with labels
- Icon-only compact mode
- Smooth spring animations
- Recent projects section
- Keyboard shortcuts hints

**Keyboard Shortcut:** `Ctrl/Cmd + B`

### 4. Breadcrumb Navigation

**Location:** `frontend/src/components/modern-ui/breadcrumb.tsx`

Context-aware breadcrumb navigation for current location.

**Features:**
- Home icon navigation
- Path hierarchy display
- Click-to-navigate
- Animated entry

### 5. Toast Notifications

**Location:** `frontend/src/components/modern-ui/toast-provider.tsx`

Non-obtrusive toast notifications using react-hot-toast.

**Features:**
- Success, error, and loading states
- Glassmorphism styling
- Auto-dismiss
- Bottom-right positioning
- Custom duration per type

**Usage:**
```tsx
import toast from 'react-hot-toast'

toast.success('File saved successfully')
toast.error('Failed to connect')
toast.loading('Processing...')
```

### 6. Skeleton Loaders

**Location:** `frontend/src/components/modern-ui/skeleton.tsx`

Loading state placeholders with smooth animations.

**Components:**
- `Skeleton` - Basic skeleton
- `SkeletonCard` - Card placeholder
- `SkeletonList` - List placeholder
- `SkeletonTable` - Table placeholder

**Usage:**
```tsx
import { SkeletonCard, SkeletonList } from '@/components/modern-ui'

<SkeletonCard />
<SkeletonList count={5} />
```

### 7. Empty States

**Location:** `frontend/src/components/modern-ui/empty-state.tsx`

Helpful empty state components with call-to-action buttons.

**Features:**
- Icon display
- Title and description
- Primary action button
- Secondary action button
- Animated entrance

**Usage:**
```tsx
import { EmptyState } from '@/components/modern-ui'
import { FileText } from 'lucide-react'

<EmptyState
  icon={FileText}
  title="No files yet"
  description="Get started by creating a new file"
  action={{
    label: 'Create New File',
    onClick: () => handleCreate()
  }}
/>
```

### 8. Context Menu

**Location:** `frontend/src/components/modern-ui/context-menu.tsx`

Right-click context menus for any component.

**Features:**
- Icon support
- Keyboard shortcuts display
- Disabled states
- Danger states (red text)
- Dividers
- Click-outside to close

**Usage:**
```tsx
import { ContextMenu } from '@/components/modern-ui'
import { Copy, Trash2 } from 'lucide-react'

const items = [
  {
    label: 'Copy',
    icon: Copy,
    onClick: () => handleCopy(),
    shortcut: 'Ctrl+C'
  },
  {
    label: 'Delete',
    icon: Trash2,
    onClick: () => handleDelete(),
    danger: true
  }
]

<ContextMenu items={items}>
  <div>Right-click me!</div>
</ContextMenu>
```

### 9. Keyboard Shortcuts

**Location:** `frontend/src/lib/hooks/use-keyboard-shortcuts.tsx`

Global keyboard shortcut handler.

**Usage:**
```tsx
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'

useKeyboardShortcuts([
  {
    key: 'k',
    ctrlKey: true,
    handler: () => openCommandPalette()
  },
  {
    key: 's',
    ctrlKey: true,
    handler: () => saveFile()
  }
])
```

### 10. Keyboard Shortcuts Dialog

**Location:** `frontend/src/components/modern-ui/keyboard-shortcuts-dialog.tsx`

A help dialog showing all available keyboard shortcuts.

**Keyboard Shortcut:** `Ctrl/Cmd + /`

### 11. Theme Toggle

**Location:** `frontend/src/components/modern-ui/theme-toggle.tsx`

An animated toggle for switching between themes.

**Features:**
- Light/Dark/System modes
- Animated background
- Icon indicators
- Responsive labels

### 12. Global Search

**Location:** `frontend/src/components/modern-ui/global-search.tsx`

Search across projects, files, and documentation.

**Features:**
- Live search results
- File type icons
- Path display
- Keyboard navigation
- Click to navigate

### 13. Tooltips

**Location:** `frontend/src/components/modern-ui/tooltip.tsx`

Hoverable tooltips and tutorial tooltips for onboarding.

**Components:**
- `Tooltip` - Standard tooltip
- `TutorialTooltip` - Step-by-step tutorial tooltip

**Usage:**
```tsx
import { Tooltip, TutorialTooltip } from '@/components/modern-ui'

<Tooltip content="Settings">
  <button>⚙️</button>
</Tooltip>

<TutorialTooltip
  content="Click here to create a new file"
  step={1}
  totalSteps={5}
  onNext={handleNext}
  onSkip={handleSkip}
>
  <button>New File</button>
</TutorialTooltip>
```

## Glassmorphism

**Location:** `frontend/src/lib/glassmorphism.ts`

Utility functions and styles for glassmorphism effects.

**Variants:**
- `card` - Standard card with blur
- `cardLight` - Light mode card
- `panel` - Sidebar/panel styling
- `popup` - Modal/dialog styling

**Usage:**
```tsx
import { getGlassmorphismStyle, getGlassmorphismClass } from '@/lib/glassmorphism'

// Inline styles
<div style={getGlassmorphismStyle('card')}>Content</div>

// Tailwind classes
<div className={getGlassmorphismClass('panel')}>Content</div>

// Or use utility classes directly
<div className="glass-card">Content</div>
<div className="glass-panel">Content</div>
<div className="glass-popup">Content</div>
```

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `Ctrl/Cmd + /` | Show keyboard shortcuts help |
| `Ctrl/Cmd + P` | Quick project switcher |
| `Ctrl/Cmd + N` | New file |
| `Ctrl/Cmd + Shift + N` | New folder |
| `Ctrl/Cmd + S` | Save file |
| `Ctrl/Cmd + W` | Close file |
| `Ctrl/Cmd + Shift + E` | Toggle Explorer |
| `Ctrl/Cmd + Shift + F` | Toggle Search |
| `Ctrl/Cmd + Shift + G` | Toggle Source Control |
| `Ctrl/Cmd + Shift + D` | Toggle Database |
| ``Ctrl/Cmd + ` `` | Toggle Terminal |
| `Esc` | Close dialogs/modals |

## Accessibility

All components are built with accessibility in mind:

- **ARIA Labels**: All interactive elements have proper labels
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus trapping in modals
- **Screen Reader Compatible**: Semantic HTML and ARIA attributes
- **Color Contrast**: WCAG 2.1 AA compliant
- **Reduced Motion**: Respects `prefers-reduced-motion` preference

## Responsive Design

Components are fully responsive with breakpoints:

- **Mobile**: 320px+ (touch-friendly targets)
- **Tablet**: 768px+
- **Desktop**: 1024px+
- **Large Desktop**: 1280px+

## Animations

All animations use Framer Motion with:

- **Spring animations** for natural feel
- **Stagger animations** for lists
- **Hover states** on interactive elements
- **Loading states** with smooth transitions
- **Page transitions** between views

## Performance

- **60fps animations** on modern devices
- **Lazy loading** for heavy components
- **Code splitting** for optimal bundle size
- **Memoization** to prevent unnecessary re-renders

## Integration Example

Here's a complete example integrating multiple components:

```tsx
'use client'

import { useState } from 'react'
import {
  CommandPalette,
  CollapsibleSidebar,
  Breadcrumb,
  ThemeToggle,
  GlobalSearch,
  EmptyState,
  ToastProvider,
} from '@/components/modern-ui'
import { useTheme } from '@/lib/hooks/use-theme'
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import toast from 'react-hot-toast'

export default function Page() {
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const { setTheme } = useTheme()

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrlKey: true,
      handler: () => setIsCommandOpen(true)
    }
  ])

  return (
    <div className="flex h-screen bg-gray-950">
      <CollapsibleSidebar />
      
      <div className="flex-1 flex flex-col">
        <header className="glass-panel h-16 flex items-center justify-between px-6">
          <Breadcrumb items={[
            { label: 'Projects', href: '/projects' },
            { label: 'My Project' }
          ]} />
          
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <EmptyState
            icon={FileText}
            title="No files yet"
            description="Get started by creating a new file"
            action={{
              label: 'Create File',
              onClick: () => toast.success('Creating...')
            }}
          />
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onThemeChange={setTheme}
      />

      <ToastProvider />
    </div>
  )
}
```

## Customization

### Theme Colors

Update `frontend/app/globals.css` to customize theme colors:

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
}
```

### Tailwind Configuration

Extend `frontend/tailwind.config.js` for custom utilities:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
        }
      }
    }
  }
}
```

## Best Practices

1. **Always use the theme system** - Don't hardcode colors
2. **Provide keyboard shortcuts** for all major actions
3. **Use toast notifications** instead of modals when possible
4. **Add loading states** with skeletons during data fetching
5. **Include empty states** with helpful CTAs
6. **Test keyboard navigation** - all features should be keyboard accessible
7. **Respect reduced motion** preferences
8. **Use context menus** for contextual actions

## Support

For issues or questions about the UI components, please refer to the component source code or create an issue in the repository.
