"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ApiStatus from "./ApiStatus";

const STYLES = [
  "boho",
  "industrial",
  "minimalist",
  "modern",
  "scandinavian",
];

export default function Home() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const [targetStyle, setTargetStyle] = useState("modern");
  const [prompt, setPrompt] = useState("");

  const [generatedImage, setGeneratedImage] = useState("");
  const [recommendations, setRecommendations] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] =
    useState(false);

  const [message, setMessage] = useState("");
  const [savedProjects, setSavedProjects] = useState([]);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    try {
      const stored = localStorage.getItem("zylo_saved_projects");

      if (stored) {
        setSavedProjects(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Could not load saved projects:", error);
    }
  }, []);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage("Please upload a JPEG, PNG or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Image must be smaller than 10 MB.");
      return;
    }

    setSelectedFile(file);
    setAnalysis(null);
    setGeneratedImage("");
    setRecommendations(null);
    setMessage("");

    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  }

  async function analyzeRoom() {
    if (!selectedFile) {
      setMessage("Upload a room image first.");
      return;
    }

    try {
      setAnalyzing(true);
      setMessage("");

      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch(
        `${apiUrl}/api/analyze-room`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Room analysis failed."
        );
      }

      setAnalysis(data);

      if (data.predicted_style) {
        setTargetStyle(data.predicted_style);

        await fetchRecommendations(
          data.predicted_style
        );
      }
    } catch (error) {
      setMessage(
        error.message || "Unable to analyze the room."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function fetchRecommendations(style) {
    if (!style) {
      return;
    }

    try {
      setLoadingRecommendations(true);

      const formData = new FormData();
      formData.append("style", style);

      const response = await fetch(
        `${apiUrl}/api/recommendations`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Could not load recommendations."
        );
      }

      setRecommendations(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRecommendations(false);
    }
  }

  async function handleStyleChange(event) {
    const newStyle = event.target.value;

    setTargetStyle(newStyle);

    await fetchRecommendations(newStyle);
  }

  async function generateRedesign() {
    if (!selectedFile) {
      setMessage("Upload a room image first.");
      return;
    }

    if (!targetStyle) {
      setMessage("Choose a target interior style.");
      return;
    }

    try {
      setGenerating(true);
      setMessage("");

      const formData = new FormData();

      formData.append("image", selectedFile);
      formData.append("target_style", targetStyle);
      formData.append("prompt", prompt);

      const response = await fetch(
        `${apiUrl}/api/redesign-room`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error(
            "AI redesign credits are currently unavailable. Style analysis and recommendations still work."
          );
        }

        throw new Error(
          data.detail || "AI redesign failed."
        );
      }

      setGeneratedImage(data.generated_image || "");
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to generate the AI redesign."
      );
    } finally {
      setGenerating(false);
    }
  }

  function convertImageToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  async function saveProject() {
    if (!selectedFile || !analysis) {
      setMessage(
        "Analyze a room before saving the project."
      );
      return;
    }

    try {
      const originalImage =
        await convertImageToDataUrl(selectedFile);

      const project = {
        id: Date.now(),
        name: `${
          targetStyle.charAt(0).toUpperCase() +
          targetStyle.slice(1)
        } Room Design`,
        image: originalImage,
        generatedImage: generatedImage || "",
        detectedStyle:
          analysis.predicted_style || "Unknown",
        confidence: analysis.confidence ?? 0,
        targetStyle,
        prompt,
        recommendations,
        savedAt: new Date().toLocaleString(),
      };

      const updatedProjects = [
        project,
        ...savedProjects,
      ];

      localStorage.setItem(
        "zylo_saved_projects",
        JSON.stringify(updatedProjects)
      );

      setSavedProjects(updatedProjects);

      setMessage("Project saved successfully.");
    } catch (error) {
      setMessage("Unable to save this project.");
    }
  }

  function deleteProject(id) {
    const updatedProjects = savedProjects.filter(
      (project) => project.id !== id
    );

    localStorage.setItem(
      "zylo_saved_projects",
      JSON.stringify(updatedProjects)
    );

    setSavedProjects(updatedProjects);
  }

  function openProject(id) {
    router.push(`/project/${id}`);
  }

  return (
    <main className="min-h-screen text-white">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#07050d]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a
            href="#home"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/10 text-xl font-black text-purple-200 shadow-lg shadow-purple-900/30">
              Z
            </div>

            <div>
              <div className="text-xl font-black tracking-[0.2em]">
                ZYLO
              </div>

              <div className="text-[10px] tracking-[0.16em] text-purple-300">
                AI INTERIOR DESIGNER
              </div>
            </div>
          </a>

          <div className="hidden items-center gap-7 text-sm text-white/60 md:flex">
            <a
              href="#home"
              className="transition hover:text-white"
            >
              Home
            </a>

            <a
              href="#design"
              className="transition hover:text-white"
            >
              Design
            </a>

            <a
              href="#recommendations"
              className="transition hover:text-white"
            >
              Recommendations
            </a>

            <a
              href="#features"
              className="transition hover:text-white"
            >
              Features
            </a>

            <a
              href="#saved"
              className="transition hover:text-white"
            >
              Saved
            </a>
          </div>

          <a
            href="#design"
            className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold shadow-lg shadow-purple-900/30 transition hover:scale-105"
          >
            Start Designing
          </a>
        </div>
      </nav>

      <section
        id="home"
        className="mx-auto grid min-h-[82vh] max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2"
      >
        <div>
          <div className="inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-purple-200">
            ✦ AI-Powered Interior Intelligence
          </div>

          <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.05] sm:text-6xl lg:text-7xl">
            Design Your
            <span className="block bg-gradient-to-r from-purple-300 via-fuchsia-300 to-yellow-200 bg-clip-text text-transparent">
              Dream Space
            </span>
            with AI Magic.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-white/55">
            Upload your room, discover its interior
            style, explore personalized design
            recommendations and transform your space
            using AI.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#design"
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-bold shadow-xl shadow-purple-900/30 transition hover:-translate-y-1"
            >
              ✨ Design My Room
            </a>

            <a
              href="#features"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-7 py-4 font-bold text-white/80 transition hover:bg-white/[0.08]"
            >
              Explore Features
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-purple-600/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-[36px] border border-purple-400/20 bg-white/[0.04] p-5 shadow-2xl shadow-purple-950/40">
            <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-purple-950/80 to-black/80 p-8">
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-purple-300">
                ZYLO Workspace
              </div>

              <div className="mt-5 text-3xl font-black">
                From room photo to design intelligence.
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <HeroMiniCard
                  icon="🧠"
                  title="AI Style Detection"
                  text="Understand your current interior style."
                />

                <HeroMiniCard
                  icon="✨"
                  title="AI Redesign"
                  text="Generate a transformed room concept."
                />

                <HeroMiniCard
                  icon="🎨"
                  title="Design Palette"
                  text="Get colors, materials and décor ideas."
                />

                <HeroMiniCard
                  icon="💾"
                  title="Saved Projects"
                  text="Return to your designs anytime."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="design"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="mb-10">
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
            AI Design Studio
          </div>

          <h2 className="mt-3 text-4xl font-black sm:text-5xl">
            Visualize Your Space
          </h2>

          <p className="mt-4 max-w-2xl text-white/50">
            Start by uploading a room photo. ZYLO will
            analyze the interior style and prepare design
            recommendations.
          </p>
        </div>

        <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-xl font-black">
                  Upload Room
                </div>

                <div className="mt-1 text-sm text-white/40">
                  JPEG, PNG or WEBP · Max 10 MB
                </div>
              </div>

              <div className="text-3xl">🏠</div>
            </div>

            <label className="flex min-h-[330px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[26px] border border-dashed border-purple-400/30 bg-purple-500/[0.05] transition hover:bg-purple-500/[0.09]">
              {preview ? (
                <img
                  src={preview}
                  alt="Selected room"
                  className="h-[330px] w-full object-cover"
                />
              ) : (
                <>
                  <div className="text-5xl">📷</div>

                  <div className="mt-5 font-bold">
                    Click to upload your room
                  </div>

                  <div className="mt-2 text-sm text-white/35">
                    Choose a clear interior photograph
                  </div>
                </>
              )}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              onClick={analyzeRoom}
              disabled={!selectedFile || analyzing}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzing
                ? "Analyzing Room..."
                : "🧠 Analyze My Room"}
            </button>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
                AI Prediction
              </div>

              {analysis ? (
                <div className="mt-6">
                  <div className="text-sm text-white/40">
                    Detected Interior Style
                  </div>

                  <div className="mt-2 text-5xl font-black capitalize">
                    {analysis.predicted_style}
                  </div>

                  <div className="mt-7 flex items-center gap-4">
                    <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-5 py-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-purple-300">
                        Confidence
                      </div>

                      <div className="mt-1 text-2xl font-black">
                        {analysis.confidence}%
                      </div>
                    </div>

                    <div className="max-w-sm text-sm leading-6 text-white/40">
                      Confidence represents the model&apos;s
                      confidence for this prediction, not
                      overall model accuracy.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-white/30">
                  Upload and analyze a room to see the AI
                  prediction.
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-7">
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
                Redesign Controls
              </div>

              <label className="mt-6 block text-sm font-semibold text-white/60">
                Target Interior Style
              </label>

              <select
                value={targetStyle}
                onChange={handleStyleChange}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#110b1d] px-4 py-4 text-white outline-none focus:border-purple-400/50"
              >
                {STYLES.map((style) => (
                  <option
                    value={style}
                    key={style}
                  >
                    {style
                      .charAt(0)
                      .toUpperCase() +
                      style.slice(1)}
                  </option>
                ))}
              </select>

              <label className="mt-6 block text-sm font-semibold text-white/60">
                Tell ZYLO what you want
              </label>

              <textarea
                value={prompt}
                onChange={(event) =>
                  setPrompt(event.target.value)
                }
                placeholder="Example: Add a black sofa, warm pendant lights, indoor plants and light wooden furniture."
                className="mt-2 min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-white outline-none placeholder:text-white/25 focus:border-purple-400/50"
              />

              <button
                onClick={generateRedesign}
                disabled={!selectedFile || generating}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-6 py-4 font-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generating
                  ? "Creating AI Redesign..."
                  : "✨ Generate AI Redesign"}
              </button>

              <p className="mt-3 text-xs leading-5 text-white/30">
                AI redesign generation requires available
                image-generation credits.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-7 rounded-2xl border border-purple-400/20 bg-purple-500/10 px-5 py-4 text-sm text-purple-100">
            {message}
          </div>
        )}
      </section>

      {(preview || generatedImage) && (
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-8">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
              Visualization
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Original vs AI Redesign
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <ImagePanel
              title="Original Room"
              image={preview}
              emptyText="Upload a room image."
            />

            <ImagePanel
              title="AI Redesign"
              image={generatedImage}
              emptyText="Your AI-generated redesign will appear here."
            />
          </div>

          {analysis && (
            <button
              onClick={saveProject}
              className="mt-7 rounded-2xl border border-purple-300/20 bg-purple-500/10 px-7 py-4 font-black text-purple-100 transition hover:bg-purple-500/20"
            >
              💾 Save Project
            </button>
          )}
        </section>
      )}

      <section
        id="recommendations"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="mb-9">
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
            ZYLO Design Intelligence
          </div>

          <h2 className="mt-3 text-4xl font-black">
            Personalized Recommendations
          </h2>
        </div>

        {loadingRecommendations ? (
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/45">
            Loading design recommendations...
          </div>
        ) : recommendations ? (
          <div className="space-y-6">
            <div className="rounded-[30px] border border-purple-400/20 bg-purple-500/[0.07] p-7">
              <h3 className="text-3xl font-black capitalize">
                {recommendations.style}
              </h3>

              <p className="mt-4 max-w-4xl leading-7 text-white/60">
                {recommendations.description}
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h3 className="mb-5 text-xl font-black">
                🎨 Color Palette
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {recommendations.palette?.map(
                  (color) => (
                    <div
                      key={color.hex}
                      className="overflow-hidden rounded-2xl border border-white/10"
                    >
                      <div
                        className="h-24"
                        style={{
                          backgroundColor:
                            color.hex,
                        }}
                      />

                      <div className="p-3">
                        <div className="font-bold">
                          {color.name}
                        </div>

                        <div className="text-xs text-white/40">
                          {color.hex}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <RecommendationCard
                title="🛋️ Furniture"
                items={recommendations.furniture}
              />

              <RecommendationCard
                title="💡 Lighting"
                items={recommendations.lighting}
              />

              <RecommendationCard
                title="🪨 Materials"
                items={recommendations.materials}
              />

              <RecommendationCard
                title="🪴 Décor"
                items={recommendations.decor}
              />
            </div>

            <div className="rounded-[30px] border border-yellow-300/20 bg-yellow-300/[0.05] p-7">
              <div className="font-bold text-yellow-200">
                ✦ ZYLO Design Tip
              </div>

              <p className="mt-3 leading-7 text-white/70">
                {recommendations.design_tip}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.03] p-12 text-center text-white/35">
            Analyze your room or choose a style to see
            personalized recommendations.
          </div>
        )}
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="mb-10 text-center">
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
            ZYLO Platform
          </div>

          <h2 className="mt-3 text-4xl font-black">
            One Workspace. Multiple AI Tools.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon="🧠"
            title="Style Detection"
            description="AI-powered interior style classification using your trained model."
            status="Working"
          />

          <FeatureCard
            icon="✨"
            title="AI Redesign"
            description="Transform room images using AI-powered redesign generation."
            status="Working"
          />

          <FeatureCard
            icon="🎨"
            title="Recommendations"
            description="Get palettes, furniture, lighting, materials and décor ideas."
            status="Working"
          />

          <FeatureCard
            icon="💾"
            title="Saved Projects"
            description="Save room analyses and reopen them from a dedicated project page."
            status="Working"
          />
        </div>
      </section>

      <section
        id="saved"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
              Your Workspace
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Saved Projects
            </h2>

            <p className="mt-3 text-white/45">
              Your projects are currently stored in this
              browser.
            </p>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm text-white/50">
            {savedProjects.length}{" "}
            {savedProjects.length === 1
              ? "project"
              : "projects"}
          </div>
        </div>

        {savedProjects.length === 0 ? (
          <div className="mt-8 rounded-[32px] border border-dashed border-white/10 bg-white/[0.03] p-14 text-center">
            <div className="text-5xl">💜</div>

            <h3 className="mt-5 text-2xl font-black">
              No saved projects yet
            </h3>

            <p className="mt-3 text-white/40">
              Analyze a room and press Save Project to
              create your first ZYLO project.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {savedProjects.map((project) => (
              <div
                key={project.id}
                className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]"
              >
                <div className="relative h-56 bg-black/30">
                  {project.generatedImage ||
                  project.image ? (
                    <img
                      src={
                        project.generatedImage ||
                        project.image
                      }
                      alt={project.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/25">
                      No image
                    </div>
                  )}

                  <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs font-bold capitalize backdrop-blur">
                    {project.targetStyle}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-black">
                    {project.name}
                  </h3>

                  <div className="mt-2 text-xs text-white/35">
                    {project.savedAt}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1.5 text-purple-200">
                      Detected:{" "}
                      {project.detectedStyle}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/50">
                      {project.confidence}%
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        openProject(project.id)
                      }
                      className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-3 text-sm font-black transition hover:scale-[1.02]"
                    >
                      Open
                    </button>

                    <button
                      onClick={() =>
                        deleteProject(project.id)
                      }
                      className="rounded-2xl border border-red-400/20 bg-red-500/[0.07] px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/[0.12]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-10 border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5">
          <div>
            <div className="font-black tracking-[0.18em]">
              ZYLO
            </div>

            <div className="mt-1 text-sm text-white/30">
              Design smarter. Live better.
            </div>
          </div>

          <div className="text-sm text-white/25">
            AI Interior Design Platform
          </div>
        </div>
      </footer>

      <ApiStatus />
    </main>
  );
}

function HeroMiniCard({
  icon,
  title,
  text,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="text-2xl">{icon}</div>

      <div className="mt-3 font-black">
        {title}
      </div>

      <p className="mt-2 text-sm leading-6 text-white/40">
        {text}
      </p>
    </div>
  );
}

function ImagePanel({
  title,
  image,
  emptyText,
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4 font-black">
        {title}
      </div>

      {image ? (
        <img
          src={image}
          alt={title}
          className="h-[420px] w-full object-cover"
        />
      ) : (
        <div className="flex h-[420px] items-center justify-center px-8 text-center text-white/30">
          {emptyText}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  title,
  items = [],
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-xl font-black">
        {title}
      </h3>

      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm leading-6 text-white/65"
          >
            ✦ {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  status,
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-purple-400/20">
      <div className="flex items-start justify-between">
        <div className="text-3xl">{icon}</div>

        <div className="rounded-full border border-green-400/20 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
          {status}
        </div>
      </div>

      <h3 className="mt-5 text-xl font-black">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-white/45">
        {description}
      </p>
    </div>
  );
}