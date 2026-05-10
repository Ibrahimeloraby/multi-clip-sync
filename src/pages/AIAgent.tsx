import React, { useState, useCallback } from 'react'
import { Plus, MessageSquare, Pin, Trash2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentChat } from '@/components/agent/AgentChat'
import { createSession } from '@/lib/agent'
import type { AgentEvent } from '@/lib/agent'
import { cn } from '@/lib/utils'

const SUGGESTED_PROMPTS = [
  'Which customers are most at risk of churning this month?',
  'Show me the top 3 customer segments by CLV',
  'What\'s the typical journey for high-value customers?',
  'Find customers who haven\'t purchased in 90 days',
  'Compute the CLV for our Champions segment',
  'What are the biggest drop-off points in our checkout funnel?',
  'Create a segment for win-back candidates with revenue > $500',
  'Show me cohort retention for the last 6 months',
]

interface ConversationItem {
  id: string
  title: string
  preview: string
  createdAt: Date
  isPinned: boolean
}

export default function AIAgent() {
  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      id: 'conv-1',
      title: 'Churn Analysis Q4',
      preview: 'Which customers are most at risk...',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isPinned: true,
    },
    {
      id: 'conv-2',
      title: 'Champions Segment CLV',
      preview: 'Show me the top 3 customer segments...',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isPinned: false,
    },
  ])
  const [activeConversationId, setActiveConversationId] = useState<string>('new')
  const [agentSession] = useState(() =>
    createSession({ orgId: 'demo-org', connectionId: undefined })
  )

  const handleSendMessage = useCallback(async (message: string): Promise<AsyncGenerator<AgentEvent>> => {
    // If new conversation, create one
    if (activeConversationId === 'new') {
      const newConv: ConversationItem = {
        id: `conv-${Date.now()}`,
        title: message.slice(0, 40) + (message.length > 40 ? '…' : ''),
        preview: message.slice(0, 60),
        createdAt: new Date(),
        isPinned: false,
      }
      setConversations((prev) => [newConv, ...prev])
      setActiveConversationId(newConv.id)
    }

    return agentSession.processMessage(message)
  }, [activeConversationId, agentSession])

  const handleNewConversation = () => {
    agentSession.clearHistory()
    setActiveConversationId('new')
  }

  const togglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => c.id === id ? { ...c, isPinned: !c.isPinned } : c)
    )
  }

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeConversationId === id) handleNewConversation()
  }

  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  function timeAgo(d: Date): string {
    const diffMs = Date.now() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-3 border-b border-gray-800">
          <Button
            onClick={handleNewConversation}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm gap-2 h-8"
          >
            <Plus className="w-4 h-4" />
            New Conversation
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sortedConversations.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Bot className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-600">No conversations yet</p>
            </div>
          ) : (
            <>
              {sortedConversations.filter((c) => c.isPinned).length > 0 && (
                <p className="px-3 py-1 text-xs text-gray-600 font-medium">PINNED</p>
              )}
              {sortedConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group mx-2 mb-0.5 rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                    activeConversationId === conv.id
                      ? 'bg-indigo-600/20 border border-indigo-600/30'
                      : 'hover:bg-gray-800'
                  )}
                  onClick={() => setActiveConversationId(conv.id)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-gray-300 truncate">{conv.title}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        className={cn('w-5 h-5 rounded flex items-center justify-center transition-colors', conv.isPinned ? 'text-indigo-400' : 'text-gray-700 hover:text-gray-400')}
                        onClick={(e) => { e.stopPropagation(); togglePin(conv.id) }}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        className="w-5 h-5 rounded flex items-center justify-center text-gray-700 hover:text-red-400 transition-colors"
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 truncate mt-0.5 ml-5">{conv.preview}</p>
                  <p className="text-xs text-gray-700 mt-0.5 ml-5">{timeAgo(conv.createdAt)}</p>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Demo mode — no API key</span>
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AgentChat
          key={activeConversationId}
          onSendMessage={handleSendMessage}
          suggestedPrompts={activeConversationId === 'new' ? SUGGESTED_PROMPTS : []}
          isNewConversation={activeConversationId === 'new'}
        />
      </div>
    </div>
  )
}
