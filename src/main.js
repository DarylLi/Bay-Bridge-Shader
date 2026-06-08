import "./style.css";
import { startBridgeNight } from "./bridgeNightApp.js";

const canvas = document.getElementById("glcanvas");
const wrap = document.getElementById("canvas-wrap");

const app = startBridgeNight({ canvas, wrap });

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.dispose();
  });
}
