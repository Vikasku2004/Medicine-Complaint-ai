
import os
import json
from typing import TypedDict, Optional

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq

load_dotenv()

EXTRACTION_MODEL = os.getenv("GROQ_EXTRACTION_MODEL", "gemma2-9b-it")
CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")

REQUIRED_FIELDS = [
    "complaint_source", "customer_name", "product_name", "product_strength_grade",
    "batch_lot_number", "manufacturing_date", "expiry_date", "quantity_affected",
    "complaint_type", "complaint_date", "detailed_description",
]


def _llm(model: str, temperature: float = 0.1) -> ChatGroq:
    return ChatGroq(model=model, temperature=temperature, api_key=os.getenv("GROQ_API_KEY"))


def _safe_json_parse(raw: str) -> dict:
    """LLMs sometimes wrap JSON in markdown fences — strip that before parsing."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.replace("json\n", "", 1) if cleaned.startswith("json\n") else cleaned
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                pass
    return {}


class AgentState(TypedDict, total=False):
    raw_text: str
    extracted: dict
    completeness_score: float
    missing_fields: list
    risk_classification: str
    ai_summary: str


EXTRACTION_PROMPT = """You are a data extraction assistant for a pharmaceutical Quality Management System (QMS).
Extract the following fields from the customer complaint text below. Return ONLY valid JSON, no prose.

Fields to extract:
- complaint_source (e.g. Email, Phone, Portal, Distributor)
- customer_name
- product_name
- product_strength_grade
- batch_lot_number
- manufacturing_date (YYYY-MM-DD if available)
- expiry_date (YYYY-MM-DD if available)
- quantity_affected (include unit, e.g. "50 kg")
- complaint_type (e.g. Quality Defect, Packaging Issue, Adverse Event, Labeling Error)
- complaint_date (YYYY-MM-DD if available)
- detailed_description (a clean 1-3 sentence summary of the complaint itself)

If a field is not mentioned, use null.

Complaint text:
---
{raw_text}
---

Return JSON with exactly these keys: {fields}
"""


def extract_fields(state: AgentState) -> AgentState:
    llm = _llm(EXTRACTION_MODEL)
    prompt = EXTRACTION_PROMPT.format(raw_text=state["raw_text"], fields=REQUIRED_FIELDS)
    response = llm.invoke(prompt)
    extracted = _safe_json_parse(response.content)
    state["extracted"] = extracted
    return state


def completeness_check(state: AgentState) -> AgentState:
    extracted = state.get("extracted", {})
    missing = [f for f in REQUIRED_FIELDS if not extracted.get(f)]
    score = round((len(REQUIRED_FIELDS) - len(missing)) / len(REQUIRED_FIELDS) * 100, 1)
    state["completeness_score"] = score
    state["missing_fields"] = missing
    return state


RISK_PROMPT = """Based on this pharmaceutical complaint, classify the risk level as one of:
Low, Medium, High, Critical.

Consider: patient safety impact, whether it's a quality defect vs. adverse event,
scale (quantity affected), and regulatory implications (e.g. contamination, mislabeling,
potency failure are higher risk than cosmetic packaging issues).

Complaint details: {extracted}

Respond with ONLY one word: Low, Medium, High, or Critical.
"""


def risk_classify(state: AgentState) -> AgentState:
    llm = _llm(EXTRACTION_MODEL)
    prompt = RISK_PROMPT.format(extracted=json.dumps(state.get("extracted", {})))
    response = llm.invoke(prompt)
    label = response.content.strip().split()[0].strip(".,") if response.content.strip() else "Medium"
    if label not in ("Low", "Medium", "High", "Critical"):
        label = "Medium"
    state["risk_classification"] = label
    return state


SUMMARY_PROMPT = """Summarize this pharmaceutical complaint in 2 concise sentences for a QMS reviewer,
highlighting the product, issue, and severity signal.

Complaint details: {extracted}
"""


def summarize(state: AgentState) -> AgentState:
    llm = _llm(EXTRACTION_MODEL)
    prompt = SUMMARY_PROMPT.format(extracted=json.dumps(state.get("extracted", {})))
    response = llm.invoke(prompt)
    state["ai_summary"] = response.content.strip()
    return state


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("extract_fields", extract_fields)
    graph.add_node("completeness_check", completeness_check)
    graph.add_node("risk_classify", risk_classify)
    graph.add_node("summarize", summarize)

    graph.set_entry_point("extract_fields")
    graph.add_edge("extract_fields", "completeness_check")
    graph.add_edge("completeness_check", "risk_classify")
    graph.add_edge("risk_classify", "summarize")
    graph.add_edge("summarize", END)

    return graph.compile()


_compiled_graph = None


def run_extraction_pipeline(raw_text: str) -> AgentState:
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    result = _compiled_graph.invoke({"raw_text": raw_text})
    return result


def chat_with_complaint(question: str, context_text: str) -> str:
    """Free-form Q&A over a complaint, using the larger Groq model for better reasoning."""
    llm = _llm(CHAT_MODEL, temperature=0.3)
    prompt = f"""You are the AI Complaint Intake Assistant inside a pharma QMS tool.
Answer the user's question about this complaint concisely and helpfully.

Complaint context:
{context_text}

User question: {question}
"""
    response = llm.invoke(prompt)
    return response.content.strip()
