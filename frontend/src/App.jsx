import ComplaintForm from './components/ComplaintForm'
import AIAssistantPanel from './components/AIAssistantPanel'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">AIVOA — Customer Complaint Management</h1>
        <p className="text-sm text-slate-500">AI-powered complaint intake for pharmaceutical manufacturing QMS</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 140px)' }}>
        <ComplaintForm />
        <AIAssistantPanel />
      </div>
    </div>
  )
}
