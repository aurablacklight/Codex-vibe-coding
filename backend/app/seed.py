"""Seed the database with default categories and sample data."""
from app.database import SessionLocal
from app.models.user import User
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.services.auth import hash_password
from datetime import date, timedelta
import random

DEFAULT_CATEGORIES = [
    # (name, icon, color, is_income, children)
    ("Income", "", "#10b981", True, [
        ("Salary", "", "#10b981", True),
        ("Freelance", "", "#34d399", True),
        ("Investments", "", "#6ee7b7", True),
        ("Other Income", "", "#a7f3d0", True),
    ]),
    ("Housing", "", "#6366f1", False, [
        ("Rent/Mortgage", "", "#6366f1", False),
        ("Utilities", "", "#818cf8", False),
        ("Insurance", "", "#a5b4fc", False),
        ("Maintenance", "", "#c7d2fe", False),
    ]),
    ("Food", "", "#f59e0b", False, [
        ("Groceries", "", "#f59e0b", False),
        ("Restaurants", "", "#fbbf24", False),
        ("Coffee", "", "#fcd34d", False),
    ]),
    ("Transportation", "", "#ef4444", False, [
        ("Gas", "", "#ef4444", False),
        ("Public Transit", "", "#f87171", False),
        ("Car Payment", "", "#fca5a5", False),
        ("Car Insurance", "", "#fecaca", False),
    ]),
    ("Entertainment", "", "#8b5cf6", False, [
        ("Streaming", "", "#8b5cf6", False),
        ("Games", "", "#a78bfa", False),
        ("Events", "", "#c4b5fd", False),
    ]),
    ("Health", "", "#ec4899", False, [
        ("Medical", "", "#ec4899", False),
        ("Dental", "", "#f472b6", False),
        ("Gym", "", "#f9a8d4", False),
    ]),
    ("Shopping", "", "#14b8a6", False, [
        ("Clothing", "", "#14b8a6", False),
        ("Electronics", "", "#2dd4bf", False),
        ("Home Goods", "", "#5eead4", False),
    ]),
    ("Personal", "", "#f97316", False, [
        ("Subscriptions", "", "#f97316", False),
        ("Education", "", "#fb923c", False),
        ("Gifts", "", "#fdba74", False),
    ]),
]

SAMPLE_PAYEES = {
    "Groceries": ["Whole Foods", "Trader Joe's", "Costco", "Safeway", "Kroger"],
    "Restaurants": ["Chipotle", "Olive Garden", "Thai Express", "Pizza Hut", "Sushi Palace"],
    "Coffee": ["Starbucks", "Blue Bottle", "Peet's Coffee", "Local Cafe"],
    "Gas": ["Shell", "Chevron", "BP", "Exxon"],
    "Streaming": ["Netflix", "Spotify", "Disney+", "HBO Max"],
    "Rent/Mortgage": ["Property Management Co."],
    "Utilities": ["Electric Co.", "Water Dept.", "Internet Provider", "Gas Company"],
    "Salary": ["Employer Inc."],
}


def seed_database():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already has data, skipping seed.")
            return

        # Create demo user
        user = User(
            username="demo",
            email="demo@budgetbolt.local",
            hashed_password=hash_password("demo123"),
        )
        db.add(user)
        db.flush()

        # Create accounts
        checking = Account(user_id=user.id, name="Main Checking", type="checking", currency="USD")
        savings = Account(user_id=user.id, name="Savings", type="savings", currency="USD")
        credit = Account(user_id=user.id, name="Credit Card", type="credit_card", currency="USD")
        db.add_all([checking, savings, credit])
        db.flush()

        # Create categories
        cat_map = {}
        for parent_name, parent_icon, parent_color, parent_income, children in DEFAULT_CATEGORIES:
            parent = Category(
                user_id=user.id, name=parent_name, icon=parent_icon,
                color=parent_color, is_income=parent_income,
            )
            db.add(parent)
            db.flush()
            cat_map[parent_name] = parent

            for child_name, child_icon, child_color, child_income in children:
                child = Category(
                    user_id=user.id, name=child_name, parent_id=parent.id,
                    icon=child_icon, color=child_color, is_income=child_income,
                )
                db.add(child)
                db.flush()
                cat_map[child_name] = child

        # Generate 3 months of sample transactions
        today = date.today()
        for month_offset in range(3):
            month_start = today.replace(day=1) - timedelta(days=30 * month_offset)
            month_start = month_start.replace(day=1)

            # Monthly salary
            salary_cat = cat_map.get("Salary")
            if salary_cat:
                db.add(Transaction(
                    user_id=user.id, account_id=checking.id, category_id=salary_cat.id,
                    date=month_start.replace(day=1), payee="Employer Inc.",
                    amount=5000.00, notes="Monthly salary",
                ))

            # Random expenses
            expense_categories = [
                ("Groceries", -40, -150, 4),
                ("Restaurants", -15, -60, 3),
                ("Coffee", -4, -8, 5),
                ("Gas", -30, -60, 2),
                ("Streaming", -12, -16, 1),
                ("Utilities", -80, -200, 1),
            ]

            for cat_name, min_amt, max_amt, count in expense_categories:
                cat = cat_map.get(cat_name)
                if not cat:
                    continue
                payees = SAMPLE_PAYEES.get(cat_name, ["Misc"])
                for _ in range(count):
                    day = random.randint(1, 28)
                    txn_date = month_start.replace(day=day)
                    db.add(Transaction(
                        user_id=user.id,
                        account_id=random.choice([checking.id, credit.id]),
                        category_id=cat.id,
                        date=txn_date,
                        payee=random.choice(payees),
                        amount=round(random.uniform(min_amt, max_amt), 2),
                        notes="",
                    ))

            # Create budgets for this month
            month_str = month_start.strftime("%Y-%m")
            budget_items = [
                ("Groceries", 600), ("Restaurants", 200), ("Coffee", 50),
                ("Gas", 150), ("Streaming", 30), ("Utilities", 300),
                ("Rent/Mortgage", 1500), ("Clothing", 100), ("Entertainment", 100),
            ]
            for cat_name, amount in budget_items:
                cat = cat_map.get(cat_name)
                if cat:
                    db.add(Budget(
                        user_id=user.id, category_id=cat.id,
                        month=month_str, assigned=amount,
                    ))

        db.commit()
        print("Database seeded successfully!")
        print("Demo login: username=demo, password=demo123")

    finally:
        db.close()


if __name__ == "__main__":
    from app.database import Base, engine
    Base.metadata.create_all(bind=engine)
    seed_database()
