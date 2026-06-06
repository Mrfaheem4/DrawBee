import { useEffect, useState } from "react";
import { supabase } from "./config/supabase";
import { CanvasProvider } from "./context/CanvasContext";
import WhiteboardPage from "./components/WhiteboardPage";
import LoginCard from "./pages/LoginCard";
import type { User } from "@supabase/supabase-js";

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return <LoginCard />;
  }

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
