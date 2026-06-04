const LoginCard = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[url('/background.png')] bg-cover bg-center p-4">
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 w-full max-w-6xl">
        {/* Left Card: Draw Bee Logo and Catchy Line */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left ">
          <img src="/logo.png" alt="Draw Bee Logo" className="h-80 " />{" "}
          <h1 className="text-7xl font-bold text-gray-800 mb-2">Draw Bee</h1>
          <p className="text-xl text-gray-600">
            Unleash Your Creativity, One Buzz at a Time
          </p>
        </div>

        {/* Right Card: Login Form */}
        <div className="w-full max-w-md py-8 rounded-2xl shadow-xl backdrop-filter backdrop-blur-lg bg-white bg-opacity-20 border border-white border-opacity-30 flex flex-col gap-6">
          <h2 className="text-3xl font-semibold text-gray-800 text-center">
            Welcome Back!
          </h2>
          <p className="text-gray-700 text-center">
            Login to continue drawing.
          </p>

          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Username"
              className="w-full p-3 rounded-lg bg-white bg-opacity-40 border border-white border-opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-600"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 rounded-lg bg-white bg-opacity-40 border border-white border-opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 placeholder-gray-600"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-700">
              <input type="checkbox" className="mr-2" /> Remember me
            </label>
            <a href="#" className="text-blue-600 hover:underline">
              Forgot password?
            </a>
          </div>

          <button className="w-full p-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg shadow-md transition duration-300 ease-in-out">
            Login
          </button>

          <div className="text-center text-gray-700">Or</div>

          <button className="w-full p-3 rounded-lg bg-white bg-opacity-40 border border-white border-opacity-50 text-gray-800 font-semibold text-lg flex items-center justify-center gap-2 shadow-md transition duration-300 ease-in-out hover:bg-opacity-50">
            <img src="/google_icon.png" alt="Google Icon" className="h-5 w-5" />{" "}
            Continue with Google
          </button>

          <div className="text-center text-gray-700 text-sm">
            Don't have an account?{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginCard;
