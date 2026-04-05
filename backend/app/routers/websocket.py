"""
Router for WebSocket connections and real-time updates.

Manages WebSocket client connections and broadcasts training status
updates to all connected clients.
"""

import threading

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="")

_ws_lock = threading.Lock()
ws_connections: dict[str, WebSocket] = {}


async def send_ws_update(job_id: str, data: dict):
    """Send a status update to all connected WebSocket clients."""
    with _ws_lock:
        clients = list(ws_connections.items())

    disconnected = []
    for client_id, ws in clients:
        try:
            await ws.send_json({"job_id": job_id, "data": data})
        except Exception:
            disconnected.append(client_id)

    if disconnected:
        with _ws_lock:
            for cid in disconnected:
                ws_connections.pop(cid, None)


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    with _ws_lock:
        ws_connections[client_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        with _ws_lock:
            ws_connections.pop(client_id, None)
