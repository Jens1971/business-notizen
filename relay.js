import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

/**
 * ✅ Set this to your Render service URL
 * Example: https://business-notes-server.onrender.com
 */
const RELAY_URL = "https://DEIN-RENDER-SERVICE.onrender.com";

function getDeviceId(){
  let id = localStorage.getItem("deviceId");
  if(!id){
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

let onReady = () => {};
let onSnapshot = () => {};
let onAction = () => {};
let onStatus = () => {};

export const socket = io(RELAY_URL, {
  transports: ["websocket"],
  auth: { deviceId: getDeviceId() }
});

socket.on("connect", () => onStatus(true));
socket.on("disconnect", () => onStatus(false));
socket.on("connect_error", (err) => onStatus(false, err?.message || "connect_error"));

socket.on("relay:ready", (msg) => onReady(msg));
socket.on("relay:snapshot", (snapshot) => onSnapshot(snapshot));
socket.on("relay:action", (action) => onAction(action));

export function initRelay({ready, snapshot, action, status}){
  if(ready) onReady = ready;
  if(snapshot) onSnapshot = snapshot;
  if(action) onAction = action;
  if(status) onStatus = status;
}

export function sendSnapshot(snapshot){
  socket.emit("relay:snapshot", snapshot);
}

export function sendAction(action){
  socket.emit("relay:action", action);
}

export function getMyDeviceId(){
  return getDeviceId();
}
