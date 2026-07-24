import { useDispatch, useSelector } from 'react-redux'
import { updateField, resetForm, saveComplaint } from '../store/complaintSlice'

const Field = ({ label, field, type = 'text', span = false }) => {
  const dispatch = useDispatch()
  const value = useSelector((s) => s.complaint.form[field])
  const status = useSelector((s) => s.complaint.extractionStatus)

  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {type === 'textarea' ? (
        <textarea
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder={status === 'loading' ? 'Awaiting AI extraction...' : ''}
          value={value || ''}
          onChange={(e) => dispatch(updateField({ field, value: e.target.value }))}
        />
      ) : (
        <input
          type={type}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={status === 'loading' ? 'Awaiting AI extraction...' : ''}
          value={value || ''}
          onChange={(e) => dispatch(updateField({ field, value: e.target.value }))}
        />
      )}
    </div>
  )
}

const SectionTitle = ({ children }) => (
  <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase mt-6 mb-3">{children}</h3>
)

export default function ComplaintForm() {
  const dispatch = useDispatch()
  const saveStatus = useSelector((s) => s.complaint.saveStatus)
  const aiMeta = useSelector((s) => s.complaint.aiMeta)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Log Customer Complaint</h2>
          <p className="text-xs text-slate-400">API &amp; FDF Quality Assurance Module</p>
        </div>
        <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
          Pending Triage
        </span>
      </div>

      {aiMeta.completeness_score !== null && (
        <div className="mt-4 flex gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
            Completeness: {aiMeta.completeness_score}%
          </span>
          {aiMeta.risk_classification && (
            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 font-medium">
              Risk: {aiMeta.risk_classification}
            </span>
          )}
        </div>
      )}

      <SectionTitle>1. Origin &amp; Customer Details</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Complaint Source" field="complaint_source" />
        <Field label="Customer Name" field="customer_name" />
      </div>

      <SectionTitle>2. Product &amp; Batch Identification</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Product Name" field="product_name" />
        <Field label="Product Strength/Grade" field="product_strength_grade" />
        <Field label="Batch/Lot Number" field="batch_lot_number" />
        <Field label="Manufacturing Date" field="manufacturing_date" type="date" />
        <Field label="Expiry Date" field="expiry_date" type="date" />
        <Field label="Quantity Affected" field="quantity_affected" />
      </div>

      <SectionTitle>3. Complaint Details</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Complaint Type" field="complaint_type" />
        <Field label="Complaint Date" field="complaint_date" type="date" />
        <Field label="Detailed Complaint Description" field="detailed_description" type="textarea" span />
      </div>

      <SectionTitle>4. Initial Assessment &amp; Priority</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Initial Severity" field="initial_severity" />
        <Field label="Priority" field="priority" />
      </div>

      {aiMeta.ai_summary && (
        <div className="mt-6 p-3 bg-slate-50 rounded-md text-xs text-slate-600">
          <span className="font-semibold text-slate-700">AI Summary: </span>
          {aiMeta.ai_summary}
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => dispatch(resetForm())}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ↺ Reset Form
        </button>
        <button
          onClick={() => dispatch(saveComplaint())}
          disabled={saveStatus === 'loading'}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-60"
        >
          {saveStatus === 'loading' ? 'Saving...' : '💾 Save Complaint'}
        </button>
      </div>
    </div>
  )
}
