export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  size?: number;
  modified?: Date;
}

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
  cursorPosition?: {
    lineNumber: number;
    column: number;
  };
}

export interface TerminalSession {
  id: string;
  title: string;
  shell: 'bash' | 'zsh' | 'fish';
  active: boolean;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

export interface Snippet {
  id: string;
  name: string;
  prefix: string;
  body: string[];
  description: string;
  scope: string;
}

export interface DebugSession {
  id: string;
  type: 'node' | 'python' | 'go';
  status: 'running' | 'paused' | 'stopped';
  breakpoints: Breakpoint[];
}

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  condition?: string;
}

export interface GitDiff {
  file: string;
  changes: GitChange[];
}

export interface GitChange {
  type: 'add' | 'delete' | 'modify';
  lineNumber: number;
  content: string;
}

export interface EditorConfig {
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  fontSize: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative';
  keyBindings: 'default' | 'vim' | 'emacs';
  formatOnSave: boolean;
}

export interface FileTemplate {
  id: string;
  name: string;
  framework: string;
  files: TemplateFile[];
}

export interface TemplateFile {
  path: string;
  content: string;
}
