import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createMalette,
  deleteMalette,
  listMalettes,
  updateMalette,
  type Chip,
  type Malette,
  type MaletteInput,
} from "../api";
import Modal from "../components/Modal";

interface FormState {
  name: string;
  chips: Chip[];
}

const emptyForm = (): FormState => ({
  name: "",
  chips: [{ value: 25, count: 100 }],
});

function fromMalette(m: Malette): FormState {
  return {
    name: m.name,
    chips: m.chips.map((c) => ({ value: c.value, count: c.count })),
  };
}

function formatDate(s: string): string {
  const iso = s.includes("T") ? s : s.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

export default function MalettesPage() {
  const [items, setItems] = useState<Malette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Malette | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Malette | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMalettes();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(m: Malette) {
    setEditing(m);
    setForm(fromMalette(m));
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;
    setShowForm(false);
  }

  function updateChip(index: number, patch: Partial<Chip>) {
    setForm((f) => ({
      ...f,
      chips: f.chips.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  function addChip() {
    setForm((f) => ({ ...f, chips: [...f.chips, { value: 0, count: 0 }] }));
  }

  function removeChip(index: number) {
    setForm((f) => ({ ...f, chips: f.chips.filter((_, i) => i !== index) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = form.name.trim();
    if (!trimmed) {
      setFormError("Le nom est requis");
      return;
    }
    if (form.chips.length === 0) {
      setFormError("Au moins un jeton est requis");
      return;
    }
    for (const c of form.chips) {
      if (c.value <= 0 || c.count <= 0) {
        setFormError("Valeur et quantité de chaque jeton doivent être > 0");
        return;
      }
    }

    const payload: MaletteInput = { name: trimmed, chips: form.chips };
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await updateMalette(editing.id, payload);
      } else {
        await createMalette(payload);
      }
      setShowForm(false);
      await refresh();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? `${err.message} (HTTP ${err.status})`
          : err instanceof Error
            ? err.message
            : String(err),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id;
    setConfirmDelete(null);
    try {
      await deleteMalette(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="page">
      <div className="page__header">
        <h2>Malettes</h2>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + Nouvelle
        </button>
      </div>

      {error && <div className="alert">Erreur: {error}</div>}

      {loading ? (
        <div className="loading">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          Aucune malette. Cliquez sur “+ Nouvelle” pour commencer.
        </div>
      ) : (
        <div className="grid">
          {items.map((m) => (
            <article key={m.id} className="card">
              <h3 className="card__title">
                <span>{m.name}</span>
                <span className="card__meta">#{m.id}</span>
              </h3>
              <div className="chip-list">
                {m.chips.map((c, i) => (
                  <span key={i} className="chip-badge">
                    {c.value} × {c.count}
                  </span>
                ))}
              </div>
              <div className="card__meta">
                Modifiée {formatDate(m.updated_at)}
              </div>
              <div className="card__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => openEdit(m)}
                >
                  Éditer
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={() => setConfirmDelete(m)}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        title={editing ? `Éditer « ${editing.name} »` : "Nouvelle malette"}
        onClose={closeForm}
      >
        <form className="form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="m-name">Nom</label>
            <input
              id="m-name"
              type="text"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ex: Malette 500 jetons"
              autoFocus
            />
          </div>

          <div className="form-field">
            <label>Jetons</label>
            <div className="chip-editor">
              {form.chips.map((c, i) => (
                <div key={i} className="chip-row">
                  <div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={c.value}
                      onChange={(e) =>
                        updateChip(i, {
                          value: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="Valeur"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={c.count}
                      onChange={(e) =>
                        updateChip(i, {
                          count: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="Quantité"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon"
                    onClick={() => removeChip(i)}
                    aria-label="Retirer ce jeton"
                    disabled={form.chips.length === 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn--ghost"
                onClick={addChip}
              >
                + Ajouter un type de jeton
              </button>
            </div>
          </div>

          {formError && <div className="alert">{formError}</div>}

          <div className="modal__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={closeForm}
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
            >
              {submitting ? "Enregistrement…" : editing ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        title="Confirmer la suppression"
        onClose={() => setConfirmDelete(null)}
      >
        <p>
          Supprimer la malette « {confirmDelete?.name} » ? Les structures liées
          seront également supprimées côté serveur.
        </p>
        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setConfirmDelete(null)}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={doDelete}
          >
            Supprimer
          </button>
        </div>
      </Modal>
    </section>
  );
}
