import { CanvasProvider } from "./context/CanvasContext";
import WhiteboardPage from "./components/WhiteboardPage";

function App() {
  return (
    <div className="w-screen h-screen bg-[url('/background.png')] bg-cover bg-center">
      <CanvasProvider>
        <div className="w-full h-full flex flex-col">
          <WhiteboardPage />
        </div>
      </CanvasProvider>
    </div>
  );
}
export default App;
