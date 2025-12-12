'use client'

import Sidebar from '@/components/Sidebar'
import Editor from '@/components/Editor'
import Terminal from '@/components/Terminal'

export default function Home() {
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <div className="flex-1 overflow-hidden">
          <Editor />
        </div>
        <div className="h-64 border-t border-gray-700">
          <Terminal />
        </div>
      </div>
    </div>
  )
}
