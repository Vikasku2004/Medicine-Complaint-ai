import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/aivoa_complaints")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # Har query se pehle connection check karega, dead ho to naya banayega
    pool_recycle=300,     # 5 minute se purane idle connections ko recycle karega
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_source = Column(String(255))
    customer_name = Column(String(255))

    product_name = Column(String(255))
    product_strength_grade = Column(String(255))
    batch_lot_number = Column(String(255))
    manufacturing_date = Column(String(50))
    expiry_date = Column(String(50))
    quantity_affected = Column(String(50))

    complaint_type = Column(String(255))
    complaint_date = Column(String(50))
    detailed_description = Column(Text)

    initial_severity = Column(String(50))
    priority = Column(String(50))

    # AI bonus fields
    completeness_score = Column(Float, nullable=True)
    missing_fields = Column(Text, nullable=True)
    risk_classification = Column(String(50), nullable=True)
    ai_summary = Column(Text, nullable=True)
    duplicate_of_id = Column(Integer, nullable=True)

    raw_source_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()