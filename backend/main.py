from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import io

from database import init_db, get_db, Complaint
from schemas import ComplaintCreate, ComplaintOut, ChatRequest, ExtractTextRequest
from langgraph_agent import run_extraction_pipeline, chat_with_complaint

app = FastAPI(title="AIVOA Complaint Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


def _extract_text_from_upload(file: UploadFile) -> str:
    content = file.file.read()
    if file.filename.lower().endswith(".pdf"):
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    # txt, eml, docx (basic) — treat as plain text for this assessment
    try:
        return content.decode("utf-8", errors="ignore")
    except Exception:
        return ""


@app.post("/api/extract/text")
def extract_from_text(payload: ExtractTextRequest):
    """Extract structured complaint fields from pasted text."""
    result = run_extraction_pipeline(payload.text)
    return {
        "extracted": result.get("extracted", {}),
        "completeness_score": result.get("completeness_score"),
        "missing_fields": result.get("missing_fields"),
        "risk_classification": result.get("risk_classification"),
        "ai_summary": result.get("ai_summary"),
        "raw_source_text": payload.text,
    }


@app.post("/api/extract/file")
def extract_from_file(file: UploadFile = File(...)):
    """Extract structured complaint fields from an uploaded PDF/DOCX/TXT/EML."""
    text = _extract_text_from_upload(file)
    if not text.strip():
        raise HTTPException(400, "Could not read any text from the uploaded file.")
    result = run_extraction_pipeline(text)
    return {
        "extracted": result.get("extracted", {}),
        "completeness_score": result.get("completeness_score"),
        "missing_fields": result.get("missing_fields"),
        "risk_classification": result.get("risk_classification"),
        "ai_summary": result.get("ai_summary"),
        "raw_source_text": text,
    }


@app.post("/api/complaints", response_model=ComplaintOut)
def save_complaint(payload: ComplaintCreate, db: Session = Depends(get_db)):
    complaint = Complaint(
        **{k: v for k, v in payload.dict().items()
           if k not in ("missing_fields",)},
        missing_fields=",".join(payload.missing_fields) if isinstance(payload.missing_fields, list) else payload.missing_fields,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Simple duplicate check against recent complaints with same product + batch
    dup = (
        db.query(Complaint)
        .filter(
            Complaint.product_name == complaint.product_name,
            Complaint.batch_lot_number == complaint.batch_lot_number,
            Complaint.id != complaint.id,
        )
        .first()
    )
    if dup:
        complaint.duplicate_of_id = dup.id
        db.commit()
        db.refresh(complaint)

    return complaint


@app.get("/api/complaints", response_model=List[ComplaintOut])
def list_complaints(db: Session = Depends(get_db)):
    return db.query(Complaint).order_by(Complaint.created_at.desc()).all()


@app.get("/api/complaints/{complaint_id}", response_model=ComplaintOut)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(404, "Complaint not found")
    return complaint


@app.post("/api/chat")
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    context = payload.context_text or ""
    if payload.complaint_id and not context:
        complaint = db.query(Complaint).filter(Complaint.id == payload.complaint_id).first()
        if complaint:
            context = complaint.raw_source_text or str(complaint.__dict__)
    answer = chat_with_complaint(payload.question, context)
    return {"answer": answer}


@app.get("/api/health")
def health():
    return {"status": "ok"}
