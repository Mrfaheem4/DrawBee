import TopBar from "./components/TopBar";
import Toolbar from "./components/ToolBar";
import CanvasArea from "./components/CanvasArea";

function App() {
  return (
    <div className="w-screen h-screen flex flex-col bg-gray-900">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        <CanvasArea />
      </div>
    </div>
  );
}
export default App;
