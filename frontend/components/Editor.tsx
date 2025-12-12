'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Monaco Editor with no SSR
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
      Loading editor...
    </div>
  ),
})

const Editor = () => {
  const [code, setCode] = useState<string>(`// Welcome to Algo IDE
// Start coding here...

function hello() {
  console.log("Hello, World!");
}

hello();
`)

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center">
        <span className="text-gray-300 text-sm">index.ts</span>
        <span className="ml-4 text-gray-500 text-xs">● Modified</span>
      </div>
      <div className="flex-1">
        <MonacoEditor
          height="100%"
          defaultLanguage="typescript"
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  )
}

export default Editor
