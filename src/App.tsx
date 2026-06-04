import { useAuth0 } from "@auth0/auth0-react";
import { CanvasProvider } from "./context/CanvasContext";
import WhiteboardPage from "./components/WhiteboardPage";
import LoginCard from "./pages/LoginCard";

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;

  if (isAuthenticated) {
    return (
      <CanvasProvider>
        <div className="w-screen h-screen flex flex-col">
          <WhiteboardPage />
        </div>
      </CanvasProvider>
    );
  }

  return <LoginCard />;
}

export default App;
