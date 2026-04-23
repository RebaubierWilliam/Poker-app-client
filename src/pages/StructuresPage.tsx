import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  createStructure,
  deleteStructure,
  listMalettes,
  listStructures,
  updateStructure,
  type Malette,
  type Structure,
  type StructureInput,
} from "../api";
import Modal from "../components/Modal";
import NumberInput from "../components/NumberInput";

interface FormState {
  malette_id: number | "";
  players: number;
  total_duration_minutes: number;
}

const emptyForm = (malettes: Malette[]): FormState => ({
  malette_id: malettes[0]?.id ?? "",
  players: 8,
  total_duration_minutes: 180,
});

function formatDate(s: string): string {
  const iso = s.includes("T") ? s : s.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

export default function StructuresPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Structure[]>([]);
  const [malettes, setMalettes] = useState<Malette[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Structure | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>({
    malette_id: "",
    players: 8,
    total_duration_minutes: 180,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Structure | null>(null);
  const [viewing, setViewing] = useState<Structure | null>(null);

  const maletteById = useMemo(() => {
    const m = new Map<number, Malette>();
    for (const x of malettes) m.set(x.id, x);
    return m;
  }, [malettes]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [structs, mals] = await Promise.all([
        listStructures(),
        listMalettes(),
      ]);
      setItems(structs);
      setMalettes(mals);
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
    if (malettes.length === 0) {
      setError("Créez d'abord une malette depuis l'onglet Malettes.");
      return;
    }
    setEditing(null);
    setForm(emptyForm(malettes));
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(s: Structure) {
    setEditing(s);
    setForm({
      malette_id: s.malette_id,
      players: s.players,
      total_duration_minutes: s.total_duration_minutes,
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    if (submitting) return;
    setShowForm(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.malette_id === "") {
      setFormError("Sélectionnez une malette");
      return;
    }
    if (form.players < 2) {
      setFormError("Minimum 2 joueurs");
      return;
    }
    if (form.total_duration_minutes <= 0) {
      setFormError("Durée doit être > 0");
      return;
    }

    const payload: StructureInput = {
      malette_id: Number(form.malette_id),
      players: form.players,
      total_duration_minutes: form.total_duration_minutes,
    };

    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await updateStructure(editing.id, payload);
      } else {
        await createStructure(payload);
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
      await deleteStructure(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="page">
      <div className="page__header">
        <h2>Structures</h2>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + Nouvelle
        </button>
      </div>

      {error && <div className="alert">Erreur: {error}</div>}

      {loading ? (
        <div className="loading">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="empty">
          Aucune structure. Cliquez sur “+ Nouvelle” pour en générer une.
        </div>
      ) : (
        <div className="grid">
          {items.map((s) => {
            const mal = maletteById.get(s.malette_id);
            return (
              <article key={s.id} className="card">
                <h3 className="card__title">
                  <span>{mal?.name ?? `Malette #${s.malette_id}`}</span>
                  <span className="card__meta">#{s.id}</span>
                </h3>
                <div className="card__meta">
                  {s.players} joueurs · {s.total_duration_minutes} min ·{" "}
                  {s.result.number_of_levels} niveaux
                </div>
                <div className="card__meta">
                  Stack: {s.result.starting_stack.toLocaleString()} · Total:{" "}
                  {s.result.total_chips.toLocaleString()}
                </div>
                <div className="card__meta">
                  Modifiée {formatDate(s.updated_at)}
                </div>
                <div className="card__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => navigate(`/structures/${s.id}/play`)}
                  >
                    ▶ Jouer
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setViewing(s)}
                  >
                    Voir
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => openEdit(s)}
                  >
                    Éditer
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => setConfirmDelete(s)}
                  >
                    Supprimer
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={showForm}
        title={editing ? `Éditer structure #${editing.id}` : "Nouvelle structure"}
        onClose={closeForm}
      >
        <form className="form" onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="s-malette">Malette</label>
            <select
              id="s-malette"
              value={form.malette_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  malette_id:
                    e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
            >
              <option value="">— Sélectionner —</option>
              {malettes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (#{m.id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="s-players">Nombre de joueurs</label>
            <NumberInput
              id="s-players"
              min={2}
              value={form.players}
              onChange={(n) => setForm((f) => ({ ...f, players: n }))}
            />
          </div>

          <div className="form-field">
            <label htmlFor="s-duration">Durée totale (minutes)</label>
            <NumberInput
              id="s-duration"
              min={1}
              value={form.total_duration_minutes}
              onChange={(n) =>
                setForm((f) => ({ ...f, total_duration_minutes: n }))
              }
            />
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
              {submitting
                ? "Enregistrement…"
                : editing
                  ? "Mettre à jour"
                  : "Créer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={viewing !== null}
        title={viewing ? `Structure #${viewing.id}` : ""}
        onClose={() => setViewing(null)}
      >
        {viewing && (
          <>
            <dl className="structure-summary">
              <div>
                <dt>Joueurs</dt>
                <dd>{viewing.players}</dd>
              </div>
              <div>
                <dt>Durée cible</dt>
                <dd>{viewing.total_duration_minutes} min</dd>
              </div>
              <div>
                <dt>Stack départ</dt>
                <dd>{viewing.result.starting_stack.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Total jetons</dt>
                <dd>{viewing.result.total_chips.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Durée niveau</dt>
                <dd>{viewing.result.level_duration_minutes} min</dd>
              </div>
              <div>
                <dt>Niveaux</dt>
                <dd>{viewing.result.number_of_levels}</dd>
              </div>
            </dl>

            <h4 className="section-title">Stack de départ par joueur</h4>
            <div className="table-wrap">
              <table className="chips-table">
                <thead>
                  <tr>
                    <th>Valeur</th>
                    <th>Quantité</th>
                    <th>Sous-total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.result.chips_per_player.map((c, i) => (
                    <tr key={i}>
                      <td>{c.value.toLocaleString()}</td>
                      <td>{c.count}</td>
                      <td>{(c.value * c.count).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="chips-table__total">
                    <td colSpan={2}>Total par joueur</td>
                    <td>{viewing.result.starting_stack.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="section-title">Niveaux de blinds</h4>
            <div className="table-wrap">
              <table className="levels-table">
                <thead>
                  <tr>
                    <th>Niv.</th>
                    <th>SB</th>
                    <th>BB</th>
                    <th>Ante</th>
                    <th>Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.result.levels.map((lv) => (
                    <tr
                      key={lv.level}
                      className={lv.is_break ? "level--break" : undefined}
                    >
                      <td>{lv.level}</td>
                      <td>
                        {lv.is_break ? "Pause" : lv.small_blind.toLocaleString()}
                      </td>
                      <td>
                        {lv.is_break ? "" : lv.big_blind.toLocaleString()}
                      </td>
                      <td>{lv.is_break ? "" : lv.ante.toLocaleString()}</td>
                      <td>{lv.duration_minutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setViewing(null)}
              >
                Fermer
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={confirmDelete !== null}
        title="Confirmer la suppression"
        onClose={() => setConfirmDelete(null)}
      >
        <p>
          Supprimer la structure #{confirmDelete?.id} ? Cette action est
          définitive.
        </p>
        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setConfirmDelete(null)}
          >
            Annuler
          </button>
          <button type="button" className="btn btn--danger" onClick={doDelete}>
            Supprimer
          </button>
        </div>
      </Modal>
    </section>
  );
}
