// import { exportAsPNG, exportAsJPEG, exportAsSVG } from "../utils/export";
import { Download } from "lucide-react";

const TopBar = () => {
  return (
    <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-center px-4 gap-4">
      <span className="text-white font-semibold text-lg text-center">
        Drawbee{" "}
      </span>
      {/* <button
        onClick={exportAsPNG}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
      >
        <Download size={14} />
        Export PNG
      </button> */}
    </div>
  );
};

export default TopBar;
