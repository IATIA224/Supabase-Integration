"""
FastAPI Backend Server
Main application entry point with CORS, routes, WebSocket, and Supabase integration
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import json
from typing import List

from routes import data, csv_operations, storage

# Load environment variables
load_dotenv()


# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)


# Initialize FastAPI app
app = FastAPI(
    title="Supabase Dashboard API",
    description="API for User and Admin dashboards with Supabase integration",
    version="1.0.0"
)

# Initialize WebSocket manager and store in app state
manager = ConnectionManager()
app.state.ws_manager = manager

# CORS configuration - allow both frontends
origins = [
    "http://localhost:5173",  # frontend-user
    "http://localhost:5174",  # frontend-admin
    f"http://localhost:{os.getenv('FRONTEND_USER_PORT', '5173')}",
    f"http://localhost:{os.getenv('FRONTEND_ADMIN_PORT', '5174')}",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(csv_operations.router, prefix="/api/csv", tags=["CSV"])
app.include_router(storage.router, prefix="/api/storage", tags=["Storage"])


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, receive any messages
            data = await websocket.receive_text()
            # Echo or handle client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Supabase Dashboard API is running"}


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "api_version": "1.0.0",
        "supabase_configured": bool(os.getenv("SUPABASE_URL"))
    }
