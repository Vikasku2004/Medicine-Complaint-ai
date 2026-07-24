from pydantic import BaseModel
from typing import Optional


class ComplaintExtracted(BaseModel):
    complaint_source: Optional[str] = None
    customer_name: Optional[str] = None
    product_name: Optional[str] = None
    product_strength_grade: Optional[str] = None
    batch_lot_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity_affected: Optional[str] = None
    complaint_type: Optional[str] = None
    complaint_date: Optional[str] = None
    detailed_description: Optional[str] = None
    initial_severity: Optional[str] = None
    priority: Optional[str] = None


class ComplaintCreate(ComplaintExtracted):
    raw_source_text: Optional[str] = None
    completeness_score: Optional[float] = None
    missing_fields: Optional[str] = None
    risk_classification: Optional[str] = None
    ai_summary: Optional[str] = None


class ComplaintOut(ComplaintCreate):
    id: int

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    complaint_id: Optional[int] = None
    context_text: Optional[str] = None
    question: str


class ExtractTextRequest(BaseModel):
    text: str
