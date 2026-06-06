import { useAuth0 } from "@auth0/auth0-react";

const LoginCard = () => {
  const { loginWithPopup } = useAuth0();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[url('/background.png')] bg-cover bg-center p-4">
      <div className="flex flex-col md:flex-row items-center justify-center gap-30 w-full max-w-6xl h-full">
        {/* Left: Logo */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left bottom">
          <img src="/logo.png" alt="Draw Bee Logo" className="h-80" />
          <h1 className="text-7xl font-bold text-gray-800 mb-2">DrawBee</h1>
          <p className="text-xl text-gray-600">
            Unleash Your Creativity, One Buzz at a Time
          </p>
        </div>

        {/* Right: Login Card */}
        <div
          className="w-full h-130 justify-center gap-20 max-w-md py-8 px-8 shadow-xl backdrop-filter backdrop-blur-md bg-white/20 border-3 border-white/40 flex flex-col gap-6"
          style={{ borderRadius: "2rem" }}
        >
          {" "}
          <div className=" flex flex-col justify-center gap-4">
            <h2 className="text-3xl font-semibold text-gray-800 text-center">
              Welcome!
            </h2>
            <p className="text-gray-400 text-center">
              Login to continue drawing.
            </p>
          </div>
          <div className="flex flex-col gap-10">
            {/* Google Login — opens a small popup, stays on your page */}
            <div className="flex flex-col justify-center items-center">
              <button
                onClick={() =>
                  loginWithPopup({
                    authorizationParams: { connection: "google-oauth2" },
                  })
                }
                className="w-90 h-12 bg-white/10 border-5 border-white/20 text-gray-800 text-lg flex items-center justify-center gap-4 shadow-md transition duration-300 ease-in-out hover:bg-white/30 hover:scale-105"
                style={{ borderRadius: "0.75rem" }}
              >
                <img
                  src="./public/google_icon.png"
                  alt="Google Icon"
                  className="h-5 w-5"
                />
                Continue with Google
              </button>
            </div>
            <div className="flex items-center gap-4 justify-center">
              {/* Email/Password — opens Auth0 popup */}
              <button
                onClick={() => loginWithPopup()}
                className="w-90 h-12 bg-white/10 border-5 border-white/20 text-gray-800 text-lg flex items-center justify-center gap-4 shadow-md transition duration-300 ease-in-out hover:bg-white/30 hover:scale-105"
                style={{ borderRadius: "0.75rem" }}
              >
                Login with Email
              </button>
            </div>
          </div>
          <div className="text-center text-gray-700 text-sm">
            Don't have an account?{" "}
            <button
              onClick={() =>
                loginWithPopup({
                  authorizationParams: { screen_hint: "signup" },
                })
              }
              className="text-blue-600 hover:underline"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginCard;
