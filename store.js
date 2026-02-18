export function saveState(state){
  localStorage.setItem("notesState", JSON.stringify(state));
}
export function loadState(){
  const saved = localStorage.getItem("notesState");
  if(saved) return JSON.parse(saved);
  return {
    topics: {
      "Ideen": { noteHistory: [{content:"", ts:0}], comments: [] },
      "Finanzen": { noteHistory: [{content:"", ts:0}], comments: [] },
      "ToDo": { noteHistory: [{content:"", ts:0}], comments: [] }
    }
  };
}
export function getCurrentNote(state, topic){
  const hist = state.topics[topic].noteHistory;
  return hist[hist.length-1];
}
export function addNoteVersion(state, topic, content, ts){
  state.topics[topic].noteHistory.push({content, ts});
  saveState(state);
}
export function undoLast(state, topic){
  if(state.topics[topic].noteHistory.length>1){
    state.topics[topic].noteHistory.pop();
    saveState(state);
  }
}
