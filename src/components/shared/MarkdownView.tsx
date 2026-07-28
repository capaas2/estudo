'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewProps {
  content: string
  className?: string
}

export default function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  return (
    <div className={`prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed space-y-3 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-extrabold text-white mt-4 mb-2 pb-1 border-b border-white/[0.08] flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-indigo-300 mt-4 mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-slate-200 mt-3 mb-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-slate-300 leading-relaxed my-1.5">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-white bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-slate-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-slate-300">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-300 my-0.5 leading-relaxed">
              {children}
            </li>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-white/[0.12] bg-[#0c0e14]">
              <table className="w-full text-left text-xs border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-indigo-500/15 border-b border-white/[0.1] text-indigo-300 font-bold uppercase tracking-wider text-[0.7rem]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/[0.06] text-slate-300">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/[0.03] transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-bold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 bg-indigo-500/10 pl-4 py-2 my-2 text-slate-300 italic rounded-r-lg">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-white/[0.08]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
