import { useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { extractFromFile, extractFromText, askAssistant } from '../store/complaintSlice'

export default function AIAssistantPanel() {
  const dispatch = useDispatch()
  const [pasteMode, setPasteMode] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [question, setQuestion] = useState('')
  const fileInputRef = useRef(null)

  const status = useSelector((s) => s.complaint.extractionStatus)
  const chatMessages = useSelector((s) => s.complaint.chatMessages)
  const chatStatus = useSelector((s) => s.complaint.chatStatus)
  const rawText = useSelector((s) => s.complaint.aiMeta.raw_source_text)

  const handleFileDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) dispatch(extractFromFile(file))
  }

  const handleFilePick = (e) => {
    const file = e.target.files?.[0]
    if (file) dispatch(extractFromFile(file))
  }

  const submitPastedText = () => {
    if (pastedText.trim()) {
      dispatch(extractFromText(pastedText))
      setPasteMode(false)
    }
  }

  const submitQuestion = () => {
    if (question.trim() && rawText) {
      dispatch(askAssistant(question))
      setQuestion('')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          ✨ AI Complaint Intake Assistant
        </h2>
        <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">BETA</span>
      </div>

      {!pasteMode ? (
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-lg py-8 flex flex-col items-center text-center cursor-pointer hover:border-blue-300 transition"
        >
          <div className="text-2xl mb-2">☁️</div>
          <p className="text-sm text-slate-600">Drag &amp; drop complaint document here</p>
          <p className="text-xs text-blue-600">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.eml"
            className="hidden"
            onChange={handleFilePick}
          />
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg p-3">
          <textarea
            className="w-full text-sm border-none focus:outline-none resize-none"
            rows={6}
            placeholder="Paste complaint email or text here..."
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => setPasteMode(false)} className="text-xs text-slate-500">Cancel</button>
            <button onClick={submitPastedText} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md">
              Extract
            </button>
          </div>
        </div>
      )}

      {!pasteMode && (
        <>
          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <button
            onClick={() => setPasteMode(true)}
            className="w-full border border-slate-200 rounded-md py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            📄 Paste Complaint Text / Email
          </button>
        </>
      )}

      <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-md px-3 py-2 mt-3">
        ⓘ Supported formats: PDF, DOCX, TXT, EML · Max size 10MB
      </p>

      {status === 'loading' && (
        <div className="mt-4">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse w-2/3" />
          </div>
          <p className="text-xs text-slate-500 mt-1">Analyzing document content and extracting key details...</p>
        </div>
      )}

      <div className="mt-4 flex-1 overflow-y-auto space-y-2">
        <div className="bg-blue-50 text-blue-900 text-xs rounded-lg p-3">
          🤖 Upload a complaint document or paste text above. I'll automatically extract the details and populate the form for you.
        </div>
        {chatMessages.map((m, i) => (
          <div
            key={i}
            className={`text-xs rounded-lg p-3 ${
              m.role === 'user' ? 'bg-slate-100 text-slate-800 ml-6' : 'bg-blue-50 text-blue-900 mr-6'
            }`}
          >
            {m.text}
          </div>
        ))}
        {chatStatus === 'loading' && (
          <div className="text-xs text-slate-400 mr-6">Thinking...</div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="Ask me anything about this complaint..."
          className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitQuestion()}
        />
        <button onClick={submitQuestion} className="bg-blue-600 text-white px-3 rounded-md">➤</button>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">AI responses may contain errors. Please verify information.</p>
    </div>
  )
}
