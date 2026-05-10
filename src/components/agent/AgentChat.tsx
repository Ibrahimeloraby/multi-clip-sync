import React, { useEffect, useRef, useState } from 'react'
import { Send, Bot, User, ChevronDown, ChevronUp, Code, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { AgentEvent } from '@/lib/agent'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallDisplay[]
  isStreaming?: boolean
}

interface ToolCallDisplay {
  id: string
  name: string
  input: Record<string, unknown>
  result?: unknown
  expanded?: boolean
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Simple markdown-to-JSX renderer (no external deps)
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <div key={`code-${i}`} className="my-2 rounded-lg overflow-hidden border border-gray-700">
          {lang && (
            <div className="bg-gray-800 px-3 py-1 text-xs text-gray-500 flex items-center gap-1.5">
              <Code className="w-3 h-3" />
              {lang.toUpperCase()}
            </div>
          )}
          <pre className="bg-gray-900 px-4 py-3 text-xs text-emerald-300 overflow-x-auto font-mono">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      )
      i++
      continue
    }

    // Heading
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-gray-200 mt-3 mb-1">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-semibold text-gray-100 mt-3 mb-1">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-bold text-white mt-3 mb-1">{line.slice(2)}</h1>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} className="text-sm text-gray-300 flex gap-2 my-0.5">
          <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(line.slice(2)) }} />
        </li>
      )
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1] ?? '1'
      elements.push(
        <li key={i} className="text-sm text-gray-300 flex gap-2 my-0.5">
          <span className="text-indigo-400 flex-shrink-0 font-mono text-xs mt-0.5">{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\. /, '')) }} />
        </li>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1" />)
    } else {
      elements.push(
        <p key={i} className="text-sm text-gray-300 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        </p>
      )
    }

    i++
  }

  return <>{elements}</>
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-gray-200 italic">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-800 text-emerald-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
}

function ToolCallCard({ toolCall, onToggle }: {
  toolCall: ToolCallDisplay
  onToggle: () => void
}) {
  return (
    <div className="my-2 border border-gray-700 rounded-lg overflow-hidden text-xs">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-left"
      >
        <Code className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
        <span className="text-gray-300 font-medium flex-1">{formatToolName(toolCall.name)}</span>
        {toolCall.result ? (
          <span className="text-emerald-400 text-xs">Done</span>
        ) : (
          <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
        )}
        {toolCall.expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
        )}
      </button>
      {toolCall.expanded && (
        <div className="bg-gray-900 p-3 space-y-2">
          <div>
            <p className="text-gray-600 mb-1">Input</p>
            <pre className="text-gray-400 font-mono text-xs overflow-x-auto">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <p className="text-gray-600 mb-1">Result</p>
              <pre className="text-emerald-400 font-mono text-xs overflow-x-auto">
                {JSON.stringify(toolCall.result, null, 2).slice(0, 800)}
                {JSON.stringify(toolCall.result, null, 2).length > 800 ? '\n...(truncated)' : ''}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface AgentChatProps {
  onSendMessage: (message: string) => Promise<AsyncGenerator<AgentEvent>>
  suggestedPrompts?: string[]
  isNewConversation?: boolean
}

export function AgentChat({ onSendMessage, suggestedPrompts = [], isNewConversation = false }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (text?: string) => {
    const messageText = text ?? input.trim()
    if (!messageText || isStreaming) return

    setInput('')
    setIsStreaming(true)

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
    }

    const assistantMsgId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    try {
      const stream = await onSendMessage(messageText)

      for await (const event of stream) {
        if (event.type === 'text') {
          setMessages((prev) =>
            prev.map((m) => m.id === assistantMsgId ? { ...m, content: m.content + (event.text ?? '') } : m)
          )
        } else if (event.type === 'tool_call') {
          const toolCallId = crypto.randomUUID()
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    toolCalls: [
                      ...(m.toolCalls ?? []),
                      { id: toolCallId, name: event.toolName ?? '', input: event.toolInput ?? {}, expanded: false },
                    ],
                  }
                : m
            )
          )
        } else if (event.type === 'tool_result') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    toolCalls: (m.toolCalls ?? []).map((tc, idx) =>
                      idx === (m.toolCalls ?? []).length - 1 && tc.name === event.toolName
                        ? { ...tc, result: event.toolResult }
                        : tc
                    ),
                  }
                : m
            )
          )
        }
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsgId ? { ...m, isStreaming: false } : m)
      )
      setIsStreaming(false)
    }
  }

  const toggleToolCall = (msgId: string, toolCallIdx: number) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              toolCalls: (m.toolCalls ?? []).map((tc, i) =>
                i === toolCallIdx ? { ...tc, expanded: !tc.expanded } : tc
              ),
            }
          : m
      )
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-200 mb-1">Ask anything about your customers</h2>
              <p className="text-sm text-gray-500">I can query your data warehouse, analyze segments, predict churn, and more.</p>
            </div>
            {suggestedPrompts.length > 0 && (
              <div className="grid grid-cols-1 gap-2 w-full max-w-lg">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isStreaming}
                    className="text-left px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm text-gray-300 hover:border-indigo-600/50 hover:bg-gray-800/80 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
              msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-700'
            )}>
              {msg.role === 'user' ? (
                <User className="w-3.5 h-3.5 text-white" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-gray-300" />
              )}
            </div>
            <div className={cn('flex-1 max-w-2xl min-w-0', msg.role === 'user' && 'flex justify-end')}>
              <div className={cn(
                'rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white text-sm'
                  : 'bg-gray-800 border border-gray-700'
              )}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="space-y-1">
                    {/* Tool calls */}
                    {(msg.toolCalls ?? []).map((tc, idx) => (
                      <ToolCallCard
                        key={tc.id}
                        toolCall={tc}
                        onToggle={() => toggleToolCall(msg.id, idx)}
                      />
                    ))}
                    {/* Text content */}
                    {msg.content && renderMarkdown(msg.content)}
                    {/* Streaming indicator */}
                    {msg.isStreaming && msg.content === '' && (msg.toolCalls ?? []).length === 0 && (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                        <span className="text-xs text-gray-500 animate-pulse">Thinking...</span>
                      </div>
                    )}
                    {msg.isStreaming && msg.content !== '' && (
                      <span className="inline-block w-1 h-4 bg-indigo-400 animate-pulse ml-0.5 -mb-0.5" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 focus-within:border-indigo-600/50 transition-colors">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your customers, segments, churn risk..."
            disabled={isStreaming}
            className="flex-1 bg-transparent border-0 text-sm text-gray-200 placeholder:text-gray-600 resize-none min-h-[20px] max-h-32 p-0 focus-visible:ring-0"
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex-shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-700 text-center mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
