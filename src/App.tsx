import { CanvasProvider } from "./context/CanvasContext";
import WhiteboardPage from "./components/WhiteboardPage";

function App() {
  return (
    <CanvasProvider>
      <div className="w-screen h-screen flex flex-col">
        <WhiteboardPage />
      </div>
    </CanvasProvider>
  );
}

export default App;
