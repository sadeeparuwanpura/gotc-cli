import { useState } from 'react';
import { ApiError } from '../../api/client';
import { createThread } from '../../api/endpoints';
import { Button } from '../../components/Button';
import { Field, fieldStyles } from '../../components/Field';
import type { ThreadDTO } from '../../api/types';
import styles from './Operations.module.css';

interface NewThreadFormProps {
  onCreated: (thread: ThreadDTO) => void;
  onCancel: () => void;
}

/**
 * Creating a thread from a position on an operation. Permitted with the `operations`
 * permission as well as `master` — this is the inline path the spec calls for.
 */
export function NewThreadForm({ onCreated, onCancel }: NewThreadFormProps): JSX.Element {
  const [brand, setBrand] = useState('');
  const [ticket, setTicket] = useState('');
  const [composition, setComposition] = useState('');
  const [colour, setColour] = useState('White');
  const [coneYield, setConeYield] = useState('5000');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(): Promise<void> {
    if (brand.trim() === '') {
      setError('Brand is required.');
      return;
    }
    const ticketValue = Number(ticket);
    if (!Number.isFinite(ticketValue) || ticketValue < 8 || ticketValue > 400) {
      setError('Ticket must be between 8 and 400. Higher ticket means finer thread.');
      return;
    }
    const yieldValue = Number(coneYield);
    if (!Number.isFinite(yieldValue) || yieldValue < 1) {
      setError('Cone yield must be a positive number of metres.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const thread = await createThread({
        brand: brand.trim(),
        ticket: ticketValue,
        composition: composition.trim() === '' ? 'Unspecified' : composition.trim(),
        colour: colour.trim() === '' ? 'White' : colour.trim(),
        coneYieldM: yieldValue
      });
      onCreated(thread);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The thread could not be created.');
      setSaving(false);
    }
  }

  return (
    <div className={styles.newThread}>
      <div className={styles.newThreadGrid}>
        <Field label="Brand" htmlFor="nt-brand">
          <input
            id="nt-brand"
            className={fieldStyles.input}
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
          />
        </Field>
        <Field label="Ticket" htmlFor="nt-ticket">
          <input
            id="nt-ticket"
            className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
            inputMode="numeric"
            value={ticket}
            onChange={(event) => setTicket(event.target.value)}
          />
        </Field>
        <Field label="Composition" htmlFor="nt-composition">
          <input
            id="nt-composition"
            className={fieldStyles.input}
            value={composition}
            onChange={(event) => setComposition(event.target.value)}
          />
        </Field>
        <Field label="Colour" htmlFor="nt-colour">
          <input
            id="nt-colour"
            className={fieldStyles.input}
            value={colour}
            onChange={(event) => setColour(event.target.value)}
          />
        </Field>
        <Field label="Cone yield m" htmlFor="nt-yield">
          <input
            id="nt-yield"
            className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
            inputMode="numeric"
            value={coneYield}
            onChange={(event) => setConeYield(event.target.value)}
          />
        </Field>
      </div>

      {error ? (
        <div className={styles.newThreadError} role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.newThreadActions}>
        <Button variant="ink" disabled={saving} onClick={() => void submit()}>
          Add thread and assign
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
