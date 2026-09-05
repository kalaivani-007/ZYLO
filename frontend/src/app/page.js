"use client";

import { useEffect, useState } from "react";
import ApiStatus from "./ApiStatus";

export default function Home() {
  const [roomFile, setRoomFile] = useState(null);
  const [roomImage, setRoomImage] = useState(null);

  const [targetStyle, setTargetStyle] = useState("Modern");
  const [prompt, setPrompt] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  function handleImageUpload(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setRoomFile(file);

    const imageURL = URL.createObjectURL(file);
    setRoomImage(imageURL);

    setAnalysisResult(null);
    setAnalysisError("");
  }

  async function analyzeRoom() {
    if (!roomFile) {
      setAnalysisError("Please choose a room image first.");
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError("");

    try {
      const formData = new FormData();

      formData.append("file", roomFile);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/analyze-room`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "ZYLO could not analyze this room."
        );
      }

      setAnalysisResult(data);
    } catch (error) {
      setAnalysisError(
        error.message || "Could not connect to ZYLO AI."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    return () => {
      if (roomImage) {
        URL.revokeObjectURL(roomImage);
      }
    };
  }, [roomImage]);

  function formatBytes(bytes) {
    if (!bytes) {
      return "0 Bytes";
    }

    const sizes = ["Bytes", "KB", "MB", "GB"];

    const index = Math.floor(
      Math.log(bytes) / Math.log(1024)
    );

    return `${(
      bytes / Math.pow(1024, index)
    ).toFixed(2)} ${sizes[index]}`;
  }

  function formatStyle(style) {
    if (!style) {
      return "";
    }

    return (
      style.charAt(0).toUpperCase() +
      style.slice(1)
    );
  }

  const orderedPredictions = analysisResult
    ? Object.entries(
        analysisResult.predictions
      ).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <main className="min-h-screen text-white">

      {/* NAVBAR */}

      <nav className="flex items-center justify-between px-6 py-6 md:px-10">

        <div className="text-2xl font-bold tracking-[0.2em] text-purple-300">
          ZYLO
        </div>

        <div className="hidden gap-8 text-sm text-gray-300 md:flex">

          <a
            href="#home"
            className="transition hover:text-purple-300"
          >
            Home
          </a>

          <a
            href="#design"
            className="transition hover:text-purple-300"
          >
            Design
          </a>

          <a
            href="#features"
            className="transition hover:text-purple-300"
          >
            Features
          </a>

          <a
            href="#saved"
            className="transition hover:text-purple-300"
          >
            Saved
          </a>

        </div>

        <a
          href="#design"
          className="rounded-full border border-purple-400 px-5 py-2 text-sm transition hover:bg-purple-500/20"
        >
          Get Started
        </a>

      </nav>


      {/* HERO */}

      <section
        id="home"
        className="px-6 pb-20 pt-14 md:px-10"
      >

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">

          {/* LEFT */}

          <div>

            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-purple-300">
              AI Interior Design Platform
            </p>

            <h1 className="text-5xl font-bold leading-tight md:text-7xl">

              Design Your

              <span className="block bg-gradient-to-r from-purple-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
                Dream Space
              </span>

              With AI

            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Upload your room and let ZYLO analyze
              its interior style using your trained
              AI model.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">

              <a
                href="#design"
                className="rounded-full bg-purple-600 px-7 py-3 font-semibold transition hover:scale-105 hover:bg-purple-500"
              >
                Analyze My Room
              </a>

              <a
                href="#features"
                className="rounded-full border border-white/20 px-7 py-3 font-semibold transition hover:bg-white/10"
              >
                Explore Features
              </a>

            </div>


            <div className="mt-10 flex flex-wrap gap-3">

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                🧠 Style AI
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                ✨ AI Render
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                🏠 3D View
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                🎬 Animate
              </div>

            </div>

          </div>


          {/* HERO PREVIEW */}

          <div className="relative">

            <div className="absolute -inset-6 rounded-[40px] bg-purple-600/20 blur-3xl"></div>

            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">

              <div className="mb-4 flex items-center justify-between">

                <div>

                  <p className="text-sm text-gray-400">
                    ZYLO Intelligence
                  </p>

                  <h3 className="text-xl font-semibold">
                    Room Style Analysis
                  </h3>

                </div>

                <span className="rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-300">
                  AI Connected
                </span>

              </div>


              <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#241337] via-[#11111b] to-[#06060b]">

                {roomImage ? (

                  <img
                    src={roomImage}
                    alt="Room preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                ) : (

                  <div className="text-center">

                    <div className="text-7xl">
                      🛋️
                    </div>

                    <p className="mt-5 text-sm text-gray-400">
                      Your room analysis will appear here
                    </p>

                  </div>

                )}

              </div>


              <div className="mt-4 grid gap-3 sm:grid-cols-3">

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                  <p className="text-xs text-gray-400">
                    AI Style
                  </p>

                  <p className="mt-1 font-semibold">

                    {analysisResult
                      ? formatStyle(
                          analysisResult.predicted_style
                        )
                      : "Waiting"}

                  </p>

                </div>


                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                  <p className="text-xs text-gray-400">
                    Confidence
                  </p>

                  <p className="mt-1 font-semibold">

                    {analysisResult
                      ? `${analysisResult.confidence}%`
                      : "--"}

                  </p>

                </div>


                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">

                  <p className="text-xs text-gray-400">
                    AI Model
                  </p>

                  <p className="mt-1 font-semibold text-green-300">
                    MobileNetV2
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* DESIGN STUDIO */}

      <section
        id="design"
        className="px-6 py-24 md:px-10"
      >

        <div className="mx-auto max-w-7xl">

          <div className="mb-12 text-center">

            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
              ZYLO Design Studio
            </p>

            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Let AI Understand Your Room
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              Upload a room photo. ZYLO sends the
              image to FastAPI and your trained
              MobileNetV2 model predicts its
              interior style.
            </p>

          </div>


          <div className="grid gap-8 lg:grid-cols-2">

            {/* UPLOAD */}

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">

              <p className="mb-4 text-lg font-semibold">
                1. Upload Your Room
              </p>


              <label className="flex min-h-[420px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-purple-400/30 bg-black/20 transition hover:border-purple-400">

                {roomImage ? (

                  <img
                    src={roomImage}
                    alt="Uploaded room"
                    className="h-full max-h-[420px] w-full object-cover"
                  />

                ) : (

                  <div className="px-6 text-center">

                    <div className="text-6xl">
                      🏠
                    </div>

                    <h3 className="mt-5 text-xl font-semibold">
                      Upload a room image
                    </h3>

                    <p className="mt-2 text-sm text-gray-400">
                      JPG, PNG or WEBP
                    </p>

                    <div className="mt-6 inline-block rounded-full bg-purple-600 px-6 py-3 font-semibold">
                      Choose Image
                    </div>

                  </div>

                )}


                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

              </label>


              {roomFile && (

                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">

                  <p className="font-medium text-white">
                    {roomFile.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    {formatBytes(roomFile.size)}
                  </p>

                </div>

              )}


              <button
                onClick={analyzeRoom}
                disabled={!roomFile || analyzing}
                className={`mt-5 w-full rounded-2xl px-6 py-4 font-semibold transition ${
                  !roomFile || analyzing
                    ? "cursor-not-allowed bg-purple-600/30 text-gray-400"
                    : "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:scale-[1.01]"
                }`}
              >

                {analyzing
                  ? "ZYLO AI is analyzing..."
                  : "Analyze Room with AI"}

              </button>


              {analysisError && (

                <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4">

                  <p className="font-semibold text-red-300">
                    Analysis Failed
                  </p>

                  <p className="mt-1 text-sm text-red-200">
                    {analysisError}
                  </p>

                </div>

              )}

            </div>


            {/* AI RESULTS */}

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">

              <p className="text-lg font-semibold">
                2. AI Analysis
              </p>


              {!analysisResult ? (

                <div className="mt-6 flex min-h-[500px] items-center justify-center rounded-3xl border border-white/10 bg-black/20 p-8 text-center">

                  <div>

                    <div className="text-6xl">
                      🧠
                    </div>

                    <h3 className="mt-5 text-xl font-semibold">
                      Waiting for a room
                    </h3>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-gray-400">
                      Upload a room image and click
                      Analyze Room with AI to see
                      your model&apos;s real prediction.
                    </p>

                  </div>

                </div>

              ) : (

                <div className="mt-6">

                  {/* MAIN RESULT */}

                  <div className="rounded-3xl border border-purple-400/20 bg-gradient-to-br from-purple-500/20 to-fuchsia-500/5 p-7">

                    <p className="text-sm uppercase tracking-[0.25em] text-purple-300">
                      Predicted Interior Style
                    </p>

                    <h3 className="mt-3 text-4xl font-bold text-white">
                      {formatStyle(
                        analysisResult.predicted_style
                      )}
                    </h3>

                    <div className="mt-5 flex items-end gap-2">

                      <p className="text-5xl font-bold text-purple-200">
                        {analysisResult.confidence}%
                      </p>

                      <p className="pb-2 text-sm text-gray-400">
                        confidence
                      </p>

                    </div>

                    <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/30">

                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400"
                        style={{
                          width: `${analysisResult.confidence}%`,
                        }}
                      />

                    </div>

                  </div>


                  {/* ALL PREDICTIONS */}

                  <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6">

                    <h4 className="font-semibold">
                      AI Style Scores
                    </h4>

                    <p className="mt-1 text-sm text-gray-500">
                      Probability returned by your
                      trained model for each class.
                    </p>


                    <div className="mt-6 space-y-5">

                      {orderedPredictions.map(
                        ([styleName, score]) => (

                          <div key={styleName}>

                            <div className="mb-2 flex items-center justify-between">

                              <span className="text-sm font-medium">
                                {formatStyle(styleName)}
                              </span>

                              <span className="text-sm text-purple-300">
                                {score}%
                              </span>

                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-white/10">

                              <div
                                className="h-full rounded-full bg-purple-500"
                                style={{
                                  width: `${score}%`,
                                }}
                              />

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  </div>


                  <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-500/10 p-5">

                    <p className="font-semibold text-green-300">
                      ✓ Real ZYLO AI Analysis
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      This result came from your
                      FastAPI backend and your
                      trained interior-style model.
                    </p>

                  </div>

                </div>

              )}

            </div>

          </div>


          {/* REDESIGN SETTINGS */}

          <div className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-6 md:p-8">

            <div>

              <p className="text-sm uppercase tracking-[0.25em] text-purple-300">
                Next Stage
              </p>

              <h3 className="mt-2 text-2xl font-bold">
                AI Room Redesign
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Choose how you want your room to
                look. We will connect real image
                generation in the next stage.
              </p>

            </div>


            <div className="mt-8 grid gap-6 md:grid-cols-2">

              <div>

                <label className="mb-3 block text-sm text-gray-300">
                  Target Interior Style
                </label>

                <select
                  value={targetStyle}
                  onChange={(event) =>
                    setTargetStyle(event.target.value)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#100b18] px-4 py-4 text-white outline-none focus:border-purple-400"
                >

                  <option>Modern</option>
                  <option>Minimalist</option>
                  <option>Scandinavian</option>
                  <option>Industrial</option>
                  <option>Boho</option>

                </select>

              </div>


              <div>

                <label className="mb-3 block text-sm text-gray-300">
                  Describe Your Dream Room
                </label>

                <textarea
                  value={prompt}
                  onChange={(event) =>
                    setPrompt(event.target.value)
                  }
                  rows="4"
                  placeholder="Warm lighting, wooden furniture, indoor plants..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#100b18] px-4 py-4 text-white outline-none placeholder:text-gray-600 focus:border-purple-400"
                />

              </div>

            </div>


            <div className="mt-7 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5">

              <p className="text-sm text-gray-400">
                Target redesign
              </p>

              <p className="mt-1 text-xl font-semibold text-purple-200">
                {targetStyle}
              </p>

              {prompt && (

                <p className="mt-3 text-sm leading-6 text-gray-300">
                  {prompt}
                </p>

              )}

            </div>


            <button
              disabled
              className="mt-6 w-full cursor-not-allowed rounded-2xl bg-purple-600/30 px-6 py-4 font-semibold text-gray-400"
            >
              Generate AI Redesign — Next Stage
            </button>

          </div>

        </div>

      </section>


      {/* FEATURES */}

      <section
        id="features"
        className="px-6 pb-24 md:px-10"
      >

        <div className="mx-auto max-w-7xl">

          <div className="mb-10 text-center">

            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
              ZYLO Platform
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-5xl">
              From understanding to transformation
            </h2>

          </div>


          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-2">

              <div className="text-3xl">
                🧠
              </div>

              <h3 className="mt-4 text-xl font-semibold">
                Style Detection
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Analyze uploaded rooms with your
                trained MobileNetV2 model.
              </p>

            </div>


            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-2">

              <div className="text-3xl">
                ✨
              </div>

              <h3 className="mt-4 text-xl font-semibold">
                AI Render
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Generate realistic redesign
                concepts from room photos.
              </p>

            </div>


            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-2">

              <div className="text-3xl">
                🏠
              </div>

              <h3 className="mt-4 text-xl font-semibold">
                3D View
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Explore redesigned spaces using
                interactive 3D visualization.
              </p>

            </div>


            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-2">

              <div className="text-3xl">
                🎬
              </div>

              <h3 className="mt-4 text-xl font-semibold">
                Animation
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Create visual walkthroughs of
                interior concepts.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* FOOTER */}

      <footer className="border-t border-white/10 px-6 py-10 text-center text-sm text-gray-500">

        <p className="text-lg font-bold tracking-[0.2em] text-purple-300">
          ZYLO
        </p>

        <p className="mt-2">
          AI Interior Design & Visualization Platform
        </p>

      </footer>


      <ApiStatus />

    </main>
  );
}