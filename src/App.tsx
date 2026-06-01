import TopBar from "./components/TopBar";
import Toolbar from "./components/ToolBar";
import CanvasArea from "./components/CanvasArea";
import { CanvasProvider } from "./context/CanvasContext";
import StickyNote from "./components/StickyNote";

function App() {
  return (
    <CanvasProvider>
      <div className="w-screen h-screen flex flex-col bg-gray-900">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Toolbar />
          <CanvasArea />
          {/* <StickyNote /> */}
        </div>
      </div>
    </CanvasProvider>
  );
}

export default App;
