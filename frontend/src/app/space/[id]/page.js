"use client";

import Protected from "@/components/Protected";
import dynamic from "next/dynamic";
import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import {
  signedImageUrls,
  uploadGeneratedImage,
  uploadRoomFile,
} from "@/lib/storage";
import { optimizeImageFile } from "@/lib/image";

const Room3D = dynamic(() => import("@/components/Room3D"), {
  ssr: false,
  loading: () => (
    <div className="viewer3d">
      <span className="muted">Loading 3D viewer…</span>
    </div>
  ),
});

const styles = [
  "Modern",
  "Minimalist",
  "Scandinavian",
  "Industrial",
  "Boho",
];

function SpaceWorkspace({ id }) {
  const [space, setSpace] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [generated, setGenerated] = useState("");
  const [target, setTarget] = useState("Modern");
  const [keep, setKeep] = useState("");
  const [change, setChange] = useState("");
  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState(25000);
  const [recs, setRecs] = useState(null);
  const [renderPreview, setRenderPreview] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [show3D, setShow3D] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [intensity, setIntensity] = useState("Balanced Redesign");
  const [feedback, setFeedback] = useState("");
  const [variation, setVariation] = useState(1);
  const [variations, setVariations] = useState([]);

  async function load() {
    setError("");

    const [{ data: s, error: se }, { data: d, error: de }] =
      await Promise.all([
        supabase
          .from("spaces")
          .select("*, homes(name,overall_style)")
          .eq("id", id)
          .single(),
        supabase
          .from("designs")
          .select("*")
          .eq("space_id", id)
          .order("created_at", { ascending: false }),
      ]);

    if (se) {
      setError(se.message);
      return;
    }

    if (de) {
      setError(de.message);
      return;
    }

    setSpace(s);

    setTarget((current) =>
      current === "Modern"
        ? s.target_style || s.homes?.overall_style || "Modern"
        : current
    );

    const paths = [];

    (d || []).forEach((x) => {
      if (x.image_path) paths.push(x.image_path);
      if (x.generated_image_path) paths.push(x.generated_image_path);
    });

    const urls = await signedImageUrls(paths);

    setDesigns(
      (d || []).map((x) => ({
        ...x,
        image_url: urls.get(x.image_path) || "",
        generated_url: urls.get(x.generated_image_path) || "",
      }))
    );
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(
    () => () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview]
  );

  async function chooseFile(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setOptimizing(true);
    setError("");
    setMsg("");

    try {
      const optimized = await optimizeImageFile(selected);

      setFile(optimized);

      setPreview((old) => {
        if (old?.startsWith("blob:")) {
          URL.revokeObjectURL(old);
        }
        return URL.createObjectURL(optimized);
      });

      setAnalysis(null);
      setGenerated("");
      setRenderPreview(null);

      if (optimized.size < selected.size) {
        setMsg(
          `Image optimized from ${(selected.size / 1024 / 1024).toFixed(
            1
          )} MB to ${(optimized.size / 1024 / 1024).toFixed(
            1
          )} MB for faster AI processing.`
        );
      }
    } catch (err) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError(
        "Could not optimize the image, so ZYLO will use the original file."
      );
    } finally {
      setOptimizing(false);
    }
  }

  function buildStructuredForm(includeFile = false) {
    const form = new FormData();

    if (includeFile && file) {
      form.append("file", file);
    }

    form.append("space_type", space?.type || "Room");
    form.append("target_style", target);
    form.append("budget", String(budget));
    form.append("keep", keep);
    form.append("change", change);
    form.append("requirements", prompt);
    form.append("intensity", intensity);
    form.append("feedback", feedback);
    form.append("variation", String(variation));

    return form;
  }

  async function analyze() {
    if (!file) {
      setError("Choose a room photo first.");
      return;
    }

    setBusy("Building your design plan…");
    setError("");
    setMsg("");

    try {
      const analysisForm = new FormData();
      analysisForm.append("file", file);
      analysisForm.append("space_type", space?.type || "Room");

      const planForm = buildStructuredForm(false);

      const [data, plan] = await Promise.all([
        apiFetch("/api/analyze-room", {
          method: "POST",
          body: analysisForm,
        }),
        apiFetch("/api/design-plan", {
          method: "POST",
          body: planForm,
        }),
      ]);

      setAnalysis(data);
      setRecs(plan);

      setMsg(
        "ZYLO analyzed the space and prepared a practical plan around your Keep, Change and budget choices."
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function previewVisualPlan() {
    if (!file) {
      setError("Choose a room photo first.");
      return;
    }

    setBusy("Checking visual redesign instructions…");
    setError("");
    setMsg("");

    try {
      const form = buildStructuredForm(false);

      const data = await apiFetch("/api/redesign-preview", {
        method: "POST",
        body: form,
      });

      setRenderPreview(data);

      setMsg(
        "Visual redesign instructions are ready. This preview does not spend Stability AI credits."
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  async function redesign() {
    if (!file) {
      setError("Choose a room photo first.");
      return;
    }

    setBusy("Generating your room while preserving the original layout…");
    setError("");
    setMsg("");

    try {
      const form = buildStructuredForm(true);

      const data = await apiFetch("/api/redesign-room", {
        method: "POST",
        body: form,
      });

      setGenerated(data.image);
      setVariations((current) => {
        const next = [
          ...current.filter((x) => x.number !== variation),
          { number: variation, image: data.image },
        ];
        return next.sort((a, b) => a.number - b.number);
      });

      setMsg(
        `AI redesign variation ${variation} generated. Compare it with the original, then save it if you like the result.`
      );
    } catch (e) {
      const message = e?.message || "AI redesign failed.";

      if (
        message.includes("credits") ||
        message.includes("402") ||
        message.includes("payment")
      ) {
        setError(
          "AI generation credits are unavailable. Your design plan is still safe and usable; no design data was lost."
        );
      } else {
        setError(message);
      }
    } finally {
      setBusy("");
    }
  }

  async function saveDesign() {
    if (!file) {
      setError("Choose a room photo first.");
      return;
    }

    setBusy("Saving securely…");
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        throw new Error("Please log in again.");
      }

      const imagePath = await uploadRoomFile(
        user.id,
        file,
        "original"
      );

      let generatedPath = null;

      try {
        if (generated) {
          generatedPath = await uploadGeneratedImage(
            user.id,
            generated
          );
        }
      } catch (e) {
        console.warn(e);
      }

      const payload = {
        space_id: id,
        home_id: space.home_id,
        user_id: user.id,
        image_path: imagePath,
        generated_image_path: generatedPath,
        detected_style: analysis?.predicted_style || null,
        confidence: analysis?.confidence || null,
        target_style: target,
        prompt: `Keep: ${keep || "—"}\nChange: ${
          change || "—"
        }\nRequirements: ${prompt || "—"}`,
        budget_inr: Number(budget),
        recommendations: recs || null,
      };

      const { data: created, error } = await supabase
        .from("designs")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      await supabase
        .from("spaces")
        .update({
          target_style: target,
          status: "designed",
        })
        .eq("id", id);

      const urls = await signedImageUrls([
        created.image_path,
        created.generated_image_path,
      ]);

      setDesigns((current) => [
        {
          ...created,
          image_url:
            urls.get(created.image_path) || preview,
          generated_url:
            urls.get(created.generated_image_path) || generated,
        },
        ...current,
      ]);

      setSpace((current) =>
        current
          ? {
              ...current,
              target_style: target,
              status: "designed",
            }
          : current
      );

      setMsg("Design saved to your private ZYLO workspace.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }

  const confidence = useMemo(
    () =>
      analysis?.confidence
        ? Math.min(100, Math.max(0, analysis.confidence))
        : 0,
    [analysis]
  );

  const actionBusy = !!busy || optimizing;

  return (
    <main className="workspace">
      <div className="workspace-header">
        <div>
          <div className="eyebrow">
            {space?.homes?.name || "Home"} / {space?.type || "Space"}
          </div>

          <h1>{space?.name || "Loading…"}</h1>

          <p className="muted">
            Upload the actual space, lock what must stay, then create a
            practical redesign.
          </p>
        </div>

        <span className="tag">{space?.status || "not designed"}</span>
      </div>

      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}

      <div className="two-col">
        <div className="card">
          <h3>1. Upload the real space</h3>

          <div className="field">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseFile}
              disabled={optimizing}
            />
          </div>

          {optimizing && (
            <p className="muted">Optimizing image for faster upload…</p>
          )}

          <div className="image-box">
            {preview ? (
              <img
                src={preview}
                alt="Room preview"
                loading="eager"
              />
            ) : (
              <span className="muted">
                Your room photo appears here
              </span>
            )}
          </div>

          <p className="muted" style={{ marginTop: 12 }}>
            Use a clear photo showing as much of the room as possible.
          </p>

          {analysis && (
            <div style={{ marginTop: 18 }}>
              <h3>Detected: {analysis.predicted_style}</h3>

              <p className="muted">
                Confidence {analysis.confidence}% — confidence is not
                the same as model accuracy.
              </p>

              <div className="progress">
                <span style={{ width: `${confidence}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>2. Tell ZYLO what you want</h3>

          <div className="field">
            <label>Target style</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {styles.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Budget (₹)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Redesign intensity</label>
            <select value={intensity} onChange={(e) => setIntensity(e.target.value)}>
              <option>Light Refresh</option>
              <option>Balanced Redesign</option>
              <option>Major Makeover</option>
            </select>
            <p className="muted" style={{ marginTop: 8 }}>
              Light Refresh preserves the most. Major Makeover allows larger movable-furniture and finish changes while still protecting the room structure and Keep list.
            </p>
          </div>

          <div className="field">
            <label>Keep</label>
            <textarea
              value={keep}
              onChange={(e) => setKeep(e.target.value)}
              placeholder="Example: bed, wardrobe, flooring, balcony railing"
            />
          </div>

          <div className="field">
            <label>Change / improve</label>
            <textarea
              value={change}
              onChange={(e) => setChange(e.target.value)}
              placeholder="Example: wall color, lighting, seating, storage"
            />
          </div>

          <div className="field">
            <label>Other requirements</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: low maintenance, renter-friendly, more plants, no structural changes"
            />
          </div>

          <div className="field">
            <label>Feedback for the next variation</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Example: make the lighting warmer, keep the sofa exactly, remove the large plant"
            />
          </div>

          <div className="field">
            <label>Variation</label>
            <select value={variation} onChange={(e) => setVariation(Number(e.target.value))}>
              <option value={1}>Variation 1</option>
              <option value={2}>Variation 2</option>
              <option value={3}>Variation 3</option>
            </select>
            <p className="muted" style={{ marginTop: 8 }}>
              ZYLO generates only the variation you request, so it does not automatically spend credits on three images.
            </p>
          </div>

          <div className="actions">
            <button
              className="btn secondary"
              onClick={analyze}
              disabled={actionBusy}
            >
              {busy || "Build my design plan"}
            </button>

            <button
              className="btn secondary"
              onClick={previewVisualPlan}
              disabled={actionBusy}
            >
              Preview visual instructions
            </button>

            <button
              className="btn"
              onClick={redesign}
              disabled={actionBusy}
            >
              Generate AI redesign
            </button>
          </div>

          <p className="muted">
            Preview Visual Instructions is free. Generate AI Redesign
            uses Stability AI credits.
          </p>
        </div>
      </div>

      {renderPreview && (
        <section style={{ marginTop: 22 }} className="card">
          <h2>Visual AI readiness</h2>

          <div className="three-col">
            <div>
              <h3>Space</h3>
              <p className="muted">{renderPreview.space_type}</p>
            </div>

            <div>
              <h3>Target</h3>
              <p className="muted">{renderPreview.target_style}</p>
            </div>

            <div>
              <h3>Generation</h3>
              <p className="muted">
                {renderPreview.generation_ready
                  ? "Stability AI configured"
                  : "Design preview ready; generation key not configured"}
              </p>
            </div>
          </div>

          <div className="divider" />
          <p className="muted">
            Intensity: <strong>{renderPreview.intensity || intensity}</strong> · Variation: <strong>{renderPreview.variation || variation}</strong>
          </p>

          <h3>What ZYLO will preserve and change</h3>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "inherit",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {renderPreview.instruction}
          </pre>
        </section>
      )}

      <section style={{ marginTop: 22 }} className="card">
        <h2>3. Before & after</h2>

        <div className="two-col">
          <div>
            <h3>Original</h3>

            <div className="image-box">
              {preview ? (
                <img src={preview} alt="Original" />
              ) : (
                <span className="muted">Upload an image</span>
              )}
            </div>
          </div>

          <div>
            <h3>AI redesign</h3>

            <div className="image-box">
              {generated ? (
                <img src={generated} alt="AI redesign" />
              ) : (
                <span className="muted">
                  {busy?.startsWith("Generating")
                    ? "ZYLO is generating your redesign…"
                    : "Your generated concept will appear here"}
                </span>
              )}
            </div>
          </div>
        </div>

        {variations.length > 0 && (
          <>
            <div className="divider" />
            <h3>Generated variations</h3>
            <div className="actions">
              {variations.map((v) => (
                <button
                  type="button"
                  key={v.number}
                  className={generated === v.image ? "btn" : "btn secondary"}
                  onClick={() => {
                    setGenerated(v.image);
                    setVariation(v.number);
                  }}
                >
                  Variation {v.number}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="actions">
          <button
            className="btn"
            onClick={saveDesign}
            disabled={actionBusy}
          >
            Save design
          </button>
        </div>
      </section>

      {recs && (
        <section style={{ marginTop: 22 }} className="card">
          <h2>4. Practical plan</h2>

          <div className="three-col">
            <div>
              <h3>Keep</h3>
              <p className="muted">
                {recs.keep?.length
                  ? recs.keep.join(", ")
                  : "No specific items locked"}
              </p>
            </div>

            <div>
              <h3>Change</h3>
              <p className="muted">
                {recs.change?.length
                  ? recs.change.join(", ")
                  : "ZYLO will focus on high-impact improvements"}
              </p>
            </div>

            <div>
              <h3>Priorities</h3>
              <p className="muted">
                {recs.priorities?.join(" · ")}
              </p>
            </div>

            <div>
              <h3>Colors</h3>
              <p className="muted">{recs.colors?.join(", ")}</p>
            </div>

            <div>
              <h3>Furniture</h3>
              <p className="muted">
                {recs.furniture?.join(", ")}
              </p>
            </div>

            <div>
              <h3>Lighting</h3>
              <p className="muted">
                {recs.lighting?.join(", ")}
              </p>
            </div>

            <div>
              <h3>Materials</h3>
              <p className="muted">
                {recs.materials?.join(", ")}
              </p>
            </div>

            <div>
              <h3>Decor</h3>
              <p className="muted">{recs.decor?.join(", ")}</p>
            </div>

            <div>
              <h3>Budget split</h3>
              <p className="muted">
                Furniture ₹
                {recs.budget_plan?.furniture?.toLocaleString()} ·
                Lighting ₹
                {recs.budget_plan?.lighting?.toLocaleString()} · Decor ₹
                {recs.budget_plan?.decor?.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="divider" />

          <strong>{recs.tip}</strong>
        </section>
      )}

      <section style={{ marginTop: 22 }} className="card">
        <h2>5. 3D visualization prototype</h2>

        {show3D ? (
          <Room3D />
        ) : (
          <>
            <p className="muted">
              The 3D engine stays unloaded until you need it, which
              keeps this workspace faster.
            </p>

            <button
              className="btn secondary"
              onClick={() => setShow3D(true)}
            >
              Load 3D viewer
            </button>
          </>
        )}
      </section>

      <section style={{ marginTop: 22 }}>
        <h2>Design history</h2>

        <div className="grid">
          {designs.map((d) => (
            <div className="card" key={d.id}>
              <div
                className="image-box"
                style={{ minHeight: 180 }}
              >
                {d.generated_url ? (
                  <img
                    src={d.generated_url}
                    alt="Saved redesign"
                    loading="lazy"
                  />
                ) : d.image_url ? (
                  <img
                    src={d.image_url}
                    alt="Saved room"
                    loading="lazy"
                  />
                ) : (
                  <span className="muted">
                    Image unavailable
                  </span>
                )}
              </div>

              <h3>{d.target_style || "Design"}</h3>

              <p className="muted">
                Budget ₹
                {Number(d.budget_inr || 0).toLocaleString()} ·{" "}
                {new Date(d.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function Page({ params }) {
  const { id } = use(params);

  return (
    <Protected>
      <SpaceWorkspace id={id} />
    </Protected>
  );
}
