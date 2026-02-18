import { initRelay, sendSnapshot, sendAction } from "./relay.js";
import { saveState, loadState, getCurrentNote, addNoteVersion, undoLast } from "./store.js";

const noteEl = document.getElementById("note");
const statusEl = document.getElementById("status");
const commentInput = document.getElementById("commentText");
const commentList = document.getElementById("commentList");
const topicsContainer = document.querySelector(".topics");

let state = loadState();
let currentTopic = Object.keys(state.topics)[0] || "Ideen";

registerServiceWorker();
renderTopics();
loadTopic(currentTopic);

initRelay({
  ready: () => {
    // Share our current state when we connect
    sendSnapshot(state);
  },
  snapshot: (snapshot) => {
    if (!snapshot || typeof snapshot !== "object") return;
    state = snapshot;
    saveState(state);

    if (!state.topics[currentTopic]) currentTopic = Object.keys(state.topics)[0] || "Ideen";
    renderTopics();
    loadTopic(currentTopic);
  },
  action: (action) => {
    applyAction(action);
  },
  status: (online, reason) => {
    if (reason === "device_not_allowed") {
      statusEl.textContent = "Nicht erlaubt";
      statusEl.className = "status offline";
      return;
    }
    if (reason === "deviceId_missing") {
      statusEl.textContent = "Device-ID Fehler";
      statusEl.className = "status offline";
      return;
    }
    statusEl.textContent = online ? "Verbunden" : "Offline";
    statusEl.className = "status " + (online ? "online" : "offline");
  }
});

function loadTopic(topic){
  currentTopic = topic;
  if(!state.topics[currentTopic]){
    state.topics[currentTopic] = { noteHistory:[{content:"", ts:0}], comments:[] };
    saveState(state);
  }
  noteEl.value = getCurrentNote(state, currentTopic).content;
  renderComments();
}

function renderTopics(){
  topicsContainer.innerHTML = "";

  for(const topic of Object.keys(state.topics)){
    const btn = document.createElement("button");
    btn.className = "topic" + (topic === currentTopic ? " active" : "");
    btn.textContent = topic;
    btn.onclick = () => {
      loadTopic(topic);
      renderTopics();
    };
    topicsContainer.appendChild(btn);
  }

  const addBtn = document.createElement("button");
  addBtn.className = "topic add";
  addBtn.textContent = "＋";
  addBtn.onclick = () => {
    const name = prompt("Neues Thema eingeben:");
    if(!name) return;
    if(!state.topics[name]){
      state.topics[name] = { noteHistory:[{content:"", ts:0}], comments:[] };
      saveState(state);
      sendAction({ type: "addTopic", name });
      sendSnapshot(state);
    }
    currentTopic = name;
    renderTopics();
    loadTopic(name);
  };
  topicsContainer.appendChild(addBtn);

  const undoBtn = document.createElement("button");
  undoBtn.className = "topic";
  undoBtn.textContent = "↺ Undo";
  undoBtn.onclick = () => {
    undoLast(state, currentTopic);
    saveState(state);
    noteEl.value = getCurrentNote(state, currentTopic).content;
    sendSnapshot(state);
  };
  topicsContainer.appendChild(undoBtn);
}

// Notes
let noteDebounce = null;
noteEl.addEventListener("input", () => {
  const ts = Date.now();
  addNoteVersion(state, currentTopic, noteEl.value, ts);
  saveState(state);

  sendAction({ type: "note", topic: currentTopic, content: noteEl.value, ts });

  clearTimeout(noteDebounce);
  noteDebounce = setTimeout(() => sendSnapshot(state), 800);
});

// Comments
document.getElementById("sendComment").onclick = () => {
  const text = commentInput.value.trim();
  if(!text) return;

  const comment = { text, ts: Date.now() };
  state.topics[currentTopic].comments.push(comment);
  saveState(state);
  renderComments();

  sendAction({ type: "comment", topic: currentTopic, payload: comment });
  sendSnapshot(state);

  commentInput.value = "";
};

function renderComments(){
  commentList.innerHTML = "";
  const arr = state.topics[currentTopic].comments;

  arr.forEach((c, i) => {
    const li = document.createElement("li");
    li.textContent = c.text;
    li.draggable = true;
    li.dataset.index = String(i);

    li.addEventListener("dragstart", (e) => {
      li.classList.add("dragging");
      e.dataTransfer.setData("text/plain", String(i));
    });

    li.addEventListener("dragend", () => li.classList.remove("dragging"));

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingEl = document.querySelector(".dragging");
      if(!draggingEl) return;

      const fromIndex = Number(draggingEl.dataset.index);
      const toIndex = i;
      if(fromIndex === toIndex) return;

      const moved = arr.splice(fromIndex, 1)[0];
      arr.splice(toIndex, 0, moved);

      saveState(state);
      renderComments();

      sendAction({ type: "commentReorder", topic: currentTopic, comments: arr });
      sendSnapshot(state);
    });

    commentList.appendChild(li);
  });
}

// Apply incoming action
function applyAction(action){
  if(!action || typeof action !== "object") return;

  if(action.type === "addTopic"){
    if(!state.topics[action.name]){
      state.topics[action.name] = { noteHistory:[{content:"", ts:0}], comments:[] };
      saveState(state);
      renderTopics();
    }
    return;
  }

  const topic = action.topic;
  if(topic && !state.topics[topic]){
    state.topics[topic] = { noteHistory:[{content:"", ts:0}], comments:[] };
  }

  if(action.type === "note"){
    const lastTs = getCurrentNote(state, topic).ts;
    if(action.ts >= lastTs){
      addNoteVersion(state, topic, action.content, action.ts);
      saveState(state);
      if(topic === currentTopic) noteEl.value = action.content;
    }
  }

  if(action.type === "comment"){
    state.topics[topic].comments.push(action.payload);
    saveState(state);
    if(topic === currentTopic) renderComments();
  }

  if(action.type === "commentReorder"){
    state.topics[topic].comments = action.comments;
    saveState(state);
    if(topic === currentTopic) renderComments();
  }
}

function registerServiceWorker(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}
