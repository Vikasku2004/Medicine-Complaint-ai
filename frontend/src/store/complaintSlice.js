import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

const API_BASE = '/api'

const emptyForm = {
  complaint_source: '',
  customer_name: '',
  product_name: '',
  product_strength_grade: '',
  batch_lot_number: '',
  manufacturing_date: '',
  expiry_date: '',
  quantity_affected: '',
  complaint_type: '',
  complaint_date: '',
  detailed_description: '',
  initial_severity: '',
  priority: '',
}

export const extractFromFile = createAsyncThunk(
  'complaint/extractFromFile',
  async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await axios.post(`${API_BASE}/extract/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }
)

export const extractFromText = createAsyncThunk(
  'complaint/extractFromText',
  async (text) => {
    const res = await axios.post(`${API_BASE}/extract/text`, { text })
    return res.data
  }
)

export const saveComplaint = createAsyncThunk(
  'complaint/saveComplaint',
  async (_, { getState, rejectWithValue }) => {
    const { form, aiMeta } = getState().complaint

    // Clean empty strings for dates and numbers so backend validation doesn't fail
    const cleanedForm = {
      ...form,
      manufacturing_date: form.manufacturing_date || null,
      expiry_date: form.expiry_date || null,
      complaint_date: form.complaint_date || null,
      quantity_affected: form.quantity_affected
        ? Number(form.quantity_affected)
        : null,
    }

    // Convert missing_fields array to a string, since backend expects a string type
    const missingFieldsStr = Array.isArray(aiMeta.missing_fields)
      ? aiMeta.missing_fields.join(', ')
      : (aiMeta.missing_fields || '')

    const payload = {
      ...cleanedForm,
      raw_source_text: aiMeta.raw_source_text,
      completeness_score: aiMeta.completeness_score,
      missing_fields: missingFieldsStr,
      risk_classification: aiMeta.risk_classification,
      ai_summary: aiMeta.ai_summary,
    }

    try {
      const res = await axios.post(`${API_BASE}/complaints`, payload)
      return res.data
    } catch (err) {
      // Capture the actual backend error message for debugging
      const detail = err.response?.data?.detail || err.message
      console.error('Save complaint failed:', detail)
      return rejectWithValue(detail)
    }
  }
)

export const askAssistant = createAsyncThunk(
  'complaint/askAssistant',
  async (question, { getState }) => {
    const { aiMeta } = getState().complaint
    const res = await axios.post(`${API_BASE}/chat`, {
      question,
      context_text: aiMeta.raw_source_text || '',
    })
    return { question, answer: res.data.answer }
  }
)

const complaintSlice = createSlice({
  name: 'complaint',
  initialState: {
    form: emptyForm,
    aiMeta: {
      completeness_score: null,
      missing_fields: [],
      risk_classification: null,
      ai_summary: null,
      raw_source_text: '',
    },
    extractionStatus: 'idle', // idle | loading | succeeded | failed
    saveStatus: 'idle',
    chatMessages: [],
    chatStatus: 'idle',
    error: null,
  },
  reducers: {
    updateField(state, action) {
      const { field, value } = action.payload
      state.form[field] = value
    },
    resetForm(state) {
      state.form = emptyForm
      state.aiMeta = {
        completeness_score: null,
        missing_fields: [],
        risk_classification: null,
        ai_summary: null,
        raw_source_text: '',
      }
      state.extractionStatus = 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(extractFromFile.pending, (state) => { state.extractionStatus = 'loading' })
      .addCase(extractFromFile.fulfilled, (state, action) => applyExtraction(state, action.payload))
      .addCase(extractFromFile.rejected, (state, action) => {
        state.extractionStatus = 'failed'
        state.error = action.error.message
      })
      .addCase(extractFromText.pending, (state) => { state.extractionStatus = 'loading' })
      .addCase(extractFromText.fulfilled, (state, action) => applyExtraction(state, action.payload))
      .addCase(extractFromText.rejected, (state, action) => {
        state.extractionStatus = 'failed'
        state.error = action.error.message
      })
      .addCase(saveComplaint.pending, (state) => { state.saveStatus = 'loading' })
      .addCase(saveComplaint.fulfilled, (state) => { state.saveStatus = 'succeeded' })
      .addCase(saveComplaint.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.error = action.payload || action.error.message
      })
      .addCase(askAssistant.pending, (state) => { state.chatStatus = 'loading' })
      .addCase(askAssistant.fulfilled, (state, action) => {
        state.chatStatus = 'succeeded'
        state.chatMessages.push(
          { role: 'user', text: action.payload.question },
          { role: 'assistant', text: action.payload.answer }
        )
      })
      .addCase(askAssistant.rejected, (state, action) => {
        state.chatStatus = 'failed'
        state.error = action.error.message
      })
  },
})

function applyExtraction(state, payload) {
  state.extractionStatus = 'succeeded'
  const extracted = payload.extracted || {}
  Object.keys(state.form).forEach((key) => {
    if (extracted[key] !== undefined && extracted[key] !== null) {
      state.form[key] = extracted[key]
    }
  })
  state.aiMeta = {
    completeness_score: payload.completeness_score,
    missing_fields: payload.missing_fields || [],
    risk_classification: payload.risk_classification,
    ai_summary: payload.ai_summary,
    raw_source_text: payload.raw_source_text || '',
  }
  if (payload.risk_classification) {
    state.form.initial_severity = payload.risk_classification
  }
}

export const { updateField, resetForm } = complaintSlice.actions
export default complaintSlice.reducer