from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # checking, savings, credit_card, cash, investment
    balance = Column(Float, default=0.0)
    currency = Column(String(3), default="USD")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", foreign_keys="[Transaction.account_id]", cascade="all, delete-orphan")
    recurring_transactions = relationship("RecurringTransaction", back_populates="account", cascade="all, delete-orphan")
