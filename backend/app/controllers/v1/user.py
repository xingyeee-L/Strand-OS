import os

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.config.database import get_session
from app.models.schemas import UserProfile
from app.services.book_service import BookService

router = APIRouter()


@router.get("/user/profile")
def get_user_profile(session: Session = Depends(get_session)):
    user = session.get(UserProfile, 1)
    if not user:
        user = UserProfile(id=1, username="Sam", level=1, current_xp=0, next_level_xp=100)
        session.add(user)
        session.commit()
    return user


@router.get("/books/list")
def list_books():
    books = BookService.get_available_books()
    rich_books = []
    for b in books:
        path = os.path.join("backend/books", b)
        try:
            with open(path, "r") as f:
                count = sum(1 for _ in f)
            rich_books.append({"name": b, "total": count})
        except Exception:
            rich_books.append({"name": b, "total": 0})
    return rich_books


@router.post("/user/set_book")
def set_user_book(book_name: str, session: Session = Depends(get_session)):
    user = session.get(UserProfile, 1)
    if book_name not in BookService.get_available_books():
        raise HTTPException(404, detail="Book not found")

    user.current_book = book_name
    session.add(user)
    session.commit()

    try:
        from app.controllers.v1.mission import generate_daily_missions

        generate_daily_missions(session)
    except Exception:
        pass

    return {"status": "success", "current_book": book_name}

