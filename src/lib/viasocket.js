const EMBED_SRC = "https://embed.viasocket.com/prod-embedcomponent.js";
let loading;

// Loads viaSocket's prebuilt-UI script once per page; later calls reuse the same promise.
export function loadEmbedScript() {
  if (window.viaSocket?.mount) return Promise.resolve(window.viaSocket);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = EMBED_SRC;
      s.async = true;
      s.onload = () => (window.viaSocket?.mount ? resolve(window.viaSocket) : reject(new Error("viaSocket did not start")));
      s.onerror = () => { loading = undefined; s.remove(); reject(new Error("Could not load viaSocket. Check your connection.")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}
