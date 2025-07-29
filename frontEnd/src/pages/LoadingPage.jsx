import React, { useEffect, useState } from "react";
import App from "../App";
import loadingVideo from "../assets/loadingvideo.mp4";

const LoadingPage = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000;
    const step = 100;
    const totalSteps = duration / step;
    let count = 0;

    const interval = setInterval(() => {
      count++;
      setProgress((count / totalSteps) * 100);
    }, step);

    const timer = setTimeout(() => {
      setLoading(false);
      clearInterval(interval);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#680a00] overflow-hidden flex items-center justify-center">
        <div className="relative max-w-full max-h-[80%] aspect-[9/16]">
          {/* Video */}
          <video
            src={loadingVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
          />

          {/* Loading Bar (inside video, bottom) */}
         <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-[200px] h-[8px] bg-white/30 rounded overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return <App />;
};

export default LoadingPage;
