import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./config/supabase";
import { CanvasProvider } from "./context/CanvasContext";
import WhiteboardPage from "./components/WhiteboardPage";
import LoginCard from "./pages/LoginCard";
import type { User } from "@supabase/supabase-js";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) syncUser(session.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) syncUser(session.user);
      else setSynced(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUser = async (user: User) => {
    const { error } = await supabase.from("users").upsert(
      { id: user.id, email: user.email },
      {
        onConflict: "id",
        ignoreDuplicates: true,
      },
    );

    if (error && error.code !== "23505") {
      setSynced(false);
    } else {
      setSynced(true);
    }
  };

  if (!user || !synced) {
    return <LoginCard />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="w-screen h-screen bg-[url('/background.png')] bg-cover bg-center">
              <CanvasProvider>
                <div className="w-full h-full flex flex-col">
                  <WhiteboardPage />
                </div>
              </CanvasProvider>
            </div>
          }
        />
        <Route
          path="/board/:boardId"
          element={
            <div className="w-screen h-screen bg-[url('/background.png')] bg-cover bg-center">
              <CanvasProvider>
                <div className="w-full h-full flex flex-col">
                  <WhiteboardPage />
                </div>
              </CanvasProvider>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
