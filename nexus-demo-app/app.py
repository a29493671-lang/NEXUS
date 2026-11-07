
from fastapi import FastAPI

app = FastAPI(title="NEXUS Demo Application")


@app.get("/")
def home():
    return {"message": "NEXUS Demo Application is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/users")
def users():
    return {
        "users": [
            {"id": 1, "name": "Akash"},
            {"id": 2, "name": "User2"},
            {"id": 3, "name": "User3"}
        ]
    }


@app.get("/login")
def login():
    return {"message": "Login service is working"}


@app.get("/orders")
def orders():
    return {
        "orders": [
            {"id": 101, "item": "Laptop"},
            {"id": 102, "item": "Keyboard"}
        ]
    }
