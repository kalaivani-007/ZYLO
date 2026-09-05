"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SavedProjectPage() {
  const params = useParams();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedProjects = localStorage.getItem(
      "zylo_saved_projects"
    );

    if (!storedProjects) {
      setLoading(false);
      return;
    }

    try {
      const projects = JSON.parse(storedProjects);

      const foundProject = projects.find(
        (item) =>
          String(item.id) === String(params.id)
      );

      setProject(foundProject || null);
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07050d] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="text-center">
            <div className="text-4xl">✨</div>

            <h1 className="mt-4 text-2xl font-black">
              Loading ZYLO Project...
            </h1>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#07050d] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center">
            <div className="text-5xl">⚠️</div>

            <h1 className="mt-5 text-3xl font-black">
              Project Not Found
            </h1>

            <p className="mt-3 text-white/50">
              This ZYLO project may have been deleted or is not
              stored in this browser.
            </p>

            <button
              onClick={() => router.push("/")}
              className="mt-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-bold"
            >
              Back to ZYLO
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07050d] text-white">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-[#07050d]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/10 text-xl font-black text-purple-300">
              Z
            </div>

            <div>
              <div className="text-xl font-black tracking-[0.18em]">
                ZYLO
              </div>

              <div className="text-xs text-purple-300">
                Saved Project
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/")}
            className="rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/20"
          >
            ← Back to Home
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        <div className="rounded-[36px] border border-purple-400/20 bg-gradient-to-br from-purple-500/[0.08] to-transparent p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
                ZYLO Project
              </div>

              <h1 className="mt-3 text-4xl font-black">
                {project.name}
              </h1>

              <p className="mt-3 text-white/40">
                Saved on {project.savedAt}
              </p>
            </div>

            <div className="rounded-full border border-purple-300/20 bg-purple-500/10 px-5 py-2 text-sm text-purple-200">
              Target:{" "}
              <span className="capitalize font-bold">
                {project.targetStyle}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-6">
          <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
            Visualization
          </div>

          <h2 className="mt-2 text-3xl font-black">
            Room Design
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ProjectImageCard
            title="Original Room"
            image={project.image}
            placeholder="Original room image unavailable."
          />

          <ProjectImageCard
            title="AI Redesign"
            image={project.generatedImage}
            placeholder="No AI redesign was generated for this saved project."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
              AI Analysis
            </div>

            <div className="mt-5">
              <div className="text-sm text-white/40">
                Detected Interior Style
              </div>

              <div className="mt-2 text-4xl font-black capitalize">
                {project.detectedStyle}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-white/40">
                Confidence
              </div>

              <div className="mt-2 text-2xl font-black text-purple-200">
                {project.confidence}%
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
              Design Request
            </div>

            <div className="mt-5">
              <div className="text-sm text-white/40">
                Target Style
              </div>

              <div className="mt-2 text-3xl font-black capitalize">
                {project.targetStyle}
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-white/40">
                Instructions
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4 leading-7 text-white/70">
                {project.prompt || "No custom instructions saved."}
              </div>
            </div>
          </div>
        </div>
      </section>

      {project.recommendations && (
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="mb-8">
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-purple-300">
              ZYLO Design Intelligence
            </div>

            <h2 className="mt-2 text-3xl font-black">
              Saved Recommendations
            </h2>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-purple-400/20 bg-purple-500/[0.07] p-7">
              <h3 className="text-3xl font-black capitalize">
                {project.recommendations.style}
              </h3>

              <p className="mt-4 leading-7 text-white/60">
                {project.recommendations.description}
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-7">
              <h3 className="mb-5 text-xl font-black">
                🎨 Color Palette
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {project.recommendations.palette?.map((color) => (
                  <div
                    key={color.hex}
                    className="overflow-hidden rounded-2xl border border-white/10"
                  >
                    <div
                      className="h-24"
                      style={{
                        backgroundColor: color.hex,
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
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <RecommendationBox
                title="🛋️ Furniture"
                items={project.recommendations.furniture}
              />

              <RecommendationBox
                title="💡 Lighting"
                items={project.recommendations.lighting}
              />

              <RecommendationBox
                title="🪨 Materials"
                items={project.recommendations.materials}
              />

              <RecommendationBox
                title="🪴 Décor"
                items={project.recommendations.decor}
              />
            </div>

            <div className="rounded-[30px] border border-yellow-300/20 bg-yellow-300/[0.05] p-7">
              <div className="font-bold text-yellow-200">
                ✦ ZYLO Design Tip
              </div>

              <p className="mt-3 leading-7 text-white/70">
                {project.recommendations.design_tip}
              </p>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/30">
        ZYLO — Design smarter. Live better.
      </footer>
    </main>
  );
}

function ProjectImageCard({
  title,
  image,
  placeholder,
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4 font-bold">
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
          {placeholder}
        </div>
      )}
    </div>
  );
}

function RecommendationBox({
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