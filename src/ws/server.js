import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024 * 2024,
  });

  server.on("upgrade", async (req, socket, head) => {
    if (req.url !== "/ws") return;

    try {
      if (wsArcjet) {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const statusCode = decision.reason.isRateLimit() ? 429 : 403;
          const statusText =
            statusCode === 429 ? "Too Many Requests" : "Forbidden";
          const body = JSON.stringify({
            error: statusCode === 429 ? "Rate limit exceeded" : "Access denied",
          });

          socket.write(
            [
              `HTTP/1.1 ${statusCode} ${statusText}`,
              "Content-Type: application/json",
              `Content-Length: ${Buffer.byteLength(body)}`,
              "Connection: close",
              "",
              body,
            ].join("\r\n")
          );
          socket.destroy();
          return;
        }
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch (e) {
      console.error("WS upgrade security error", e);
      socket.destroy();
    }
  });

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });
    sendJson(socket, { type: "welcome" });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 3000);

  wss.on("close", () => clearInterval(interval));

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "patch_created", data: match });
  }

  return { broadcastMatchCreated };
}
