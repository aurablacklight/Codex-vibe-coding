from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


def build_category_tree(categories: list[Category]) -> list[dict]:
    by_parent = {}
    for cat in categories:
        parent = cat.parent_id or 0
        by_parent.setdefault(parent, []).append(cat)

    def build_children(parent_id: int) -> list[dict]:
        children = by_parent.get(parent_id, [])
        result = []
        for cat in children:
            item = {
                "id": cat.id,
                "name": cat.name,
                "parent_id": cat.parent_id,
                "icon": cat.icon,
                "color": cat.color,
                "is_income": cat.is_income,
                "created_at": cat.created_at,
                "children": build_children(cat.id),
            }
            result.append(item)
        return result

    return build_children(0)


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    flat: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    categories = db.query(Category).filter(
        Category.user_id == current_user.id,
    ).all()

    if flat:
        return categories

    return build_category_tree(categories)


@router.post("", response_model=CategoryResponse)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = Category(user_id=current_user.id, **data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id,
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id,
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(category)
    db.commit()
    return {"message": "Category deleted"}
