"use client";

import type { Interpretation } from "../lib/interpret";
import { Chip, Mark, type OpenClaim } from "./evidence-ui";

export function Interpret({ view, open }: { view: Interpretation; open: OpenClaim }) {
  return (
    <section className="interpret" aria-labelledby="interpret-heading">
      <h3 id="interpret-heading">Interpretation</h3>
      <p className="small muted">{view.disclosure}</p>
      {view.notes.map(note => <p className="interpret-note" key={note}>{note}</p>)}
      {view.sentences.length > 0 && (
        <ol className="interpret-sentences">
          {view.sentences.map(item => (
            <li key={item.claim.claim_id}>
              <div className="claim-meta"><Mark claim={item.claim} /></div>
              <p>{item.text} <Chip claim={item.claim} open={open} /></p>
            </li>
          ))}
        </ol>
      )}
      {view.nearest.length > 0 && (
        <p className="small muted">Nearest evidence is listed below and is not treated as the answer when the gravity or condition does not match the question.</p>
      )}
    </section>
  );
}
