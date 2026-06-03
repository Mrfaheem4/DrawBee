import TopBar from "./components/TopBar";
import CanvasArea from "./components/CanvasArea";
import { CanvasProvider } from "./context/CanvasContext";

function App() {
  return (
    <CanvasProvider>
      <div className="w-screen h-screen flex flex-col bg-gray-900">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <CanvasArea />
        </div>
      </div>
    </CanvasProvider>
  );
}

export default App;
