'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`markdown-content space-y-4 text-gray-200 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold text-white mt-6 mb-3 border-b border-blue-500 pb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold text-white mt-5 mb-3 border-b border-indigo-500 pb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold text-indigo-300 mt-4 mb-2" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg font-semibold text-indigo-400 mt-3 mb-1" {...props} />
          ),
          h5: ({ node, ...props }) => (
            <h5 className="text-base font-semibold text-indigo-400 mt-2 mb-1" {...props} />
          ),
          h6: ({ node, ...props }) => (
            <h6 className="text-sm font-semibold text-indigo-400 mt-2 mb-1" {...props} />
          ),
          
          // Paragraphs
          p: ({ node, ...props }) => (
            <p className="text-base leading-relaxed text-gray-300" {...props} />
          ),
          
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-2 ml-2 text-gray-300" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 ml-2 text-gray-300" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-gray-300" {...props} />
          ),
          
          // Code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            
            if (inline) {
              // Inline code
              return (
                <code 
                  className="bg-gray-800 text-cyan-300 px-2 py-1 rounded text-sm font-mono border border-gray-700"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            // Code block
            return (
              <div className="relative my-4">
                {lang && (
                  <div className="absolute top-2 right-2 text-xs font-semibold text-gray-400 bg-gray-900 px-3 py-1 rounded">
                    {lang}
                  </div>
                )}
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto border border-gray-700 text-sm font-mono">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote 
              className="border-l-4 border-blue-500 bg-blue-900/20 pl-4 py-2 my-4 italic text-blue-200 rounded"
              {...props} 
            />
          ),
          
          // Links
          a: ({ node, ...props }) => (
            <a 
              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          
          // Emphasis
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-yellow-300" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-cyan-300" {...props} />
          ),
          
          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-gray-700" {...props} />
          ),
          
          // Tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-700" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-800 border-b border-gray-700" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="border-b border-gray-700" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2 text-left font-semibold text-white" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2 text-gray-300" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
