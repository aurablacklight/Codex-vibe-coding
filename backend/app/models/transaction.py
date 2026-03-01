from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    date = Column(Date, nullable=False)
    payee = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)  # negative = expense, positive = income
    notes = Column(Text, default="")
    is_transfer = Column(Boolean, default=False)
    transfer_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    recurring_id = Column(Integer, ForeignKey("recurring_transactions.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions", foreign_keys=[account_id])
    category = relationship("Category", back_populates="transactions")
    transfer_account = relationship("Account", foreign_keys=[transfer_account_id])
    recurring = relationship("RecurringTransaction", back_populates="transactions")
