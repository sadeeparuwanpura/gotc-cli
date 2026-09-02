import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import {
  createGarment,
  fetchCalculation,
  fetchFabrics,
  fetchGarments,
  fetchNextStyleNumber,
  WHOLE_SET
} from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { Button } from '../../components/Button';
import { Card, CardBody, CardHeader, Screen, ScreenHeader } from '../../components/Screen';
import { Field, fieldStyles } from '../../components/Field';
import { Num } from '../../components/Num';
import { noticeState } from '../../lib/notice';
import { GARMENT_STATUSES, type GarmentStatus } from '../../api/types';
import styles from './NewGarment.module.css';

/** Suggested parts are a frontend constant, not a collection. Users may type others. */
const SUGGESTED_PARTS = [
  'Body',
  'Sleeve',
  'Neckband',
  'Collar',
  'Cuff',
  'Hood',
  'Pocket',
  'Hem',
  'Neck tape',
  'Placket',
  'Waistband',
  'Side panel'
];

interface FabricRow {
  fabricId: string;
  parts: string[];
  custom: string;
}

const BLANK_ROW: FabricRow = { fabricId: '', parts: [], custom: '' };

export function NewGarment(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [styleNumber, setStyleNumber] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const [buyer, setBuyer] = useState('');
  const [season, setSeason] = useState('');
  const [sizeRange, setSizeRange] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [wastagePercent, setWastagePercent] = useState('12');
  const [status, setStatus] = useState<GarmentStatus>('Draft');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<FabricRow[]>([BLANK_ROW]);
  const [copyFrom, setCopyFrom] = useState('');
  const [startFromCopy, setStartFromCopy] = useState(false);
  const [error, setError] = useState('');

  // The fabric picker needs every fabric, not the first page.
  const fabrics = useQuery({
    queryKey: queryKeys.fabrics(1, '', 200),
    queryFn: ({ signal }) => fetchFabrics(WHOLE_SET, signal)
  });
  // The copy-from select and the duplicate-style check both need the whole library.
  const garments = useQuery({
    queryKey: queryKeys.garments(1, '', 200),
    queryFn: ({ signal }) => fetchGarments(WHOLE_SET, signal)
  });
  const nextStyle = useQuery({
    queryKey: queryKeys.nextStyleNumber,
    queryFn: ({ signal }) => fetchNextStyleNumber(signal)
  });

  // Pre-fill the next free number once, without clobbering what the user typed.
  useEffect(() => {
    if (nextStyle.data && styleNumber === '') {
      setStyleNumber(nextStyle.data.styleNumber);
    }
  }, [nextStyle.data, styleNumber]);

  const quantity = Number(orderQuantity);
  const hasQuantity = Number.isFinite(quantity) && quantity > 0;
  const copySources = (garments.data?.items ?? []).filter((garment) => garment.operationCount > 0);
  const source = copySources.find((garment) => garment.id === copyFrom) ?? null;

  // The estimate reuses the server's preview parameters — no arithmetic in the browser.
  const estimate = useQuery({
    queryKey: [...queryKeys.garmentCalculation(copyFrom), 'estimate', orderQuantity],
    queryFn: ({ signal }) => fetchCalculation(copyFrom, { quantity }, signal),
    enabled: startFromCopy && copyFrom !== '' && hasQuantity
  });

  const create = useMutation({
    mutationFn: createGarment,
    onSuccess: (garment) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
      void queryClient.invalidateQueries({ queryKey: queryKeys.nextStyleNumber });
      navigate(`/garments/${garment.id}`, {
        state: noticeState({
          variant: 'success',
          message:
            garment.operationsCopied > 0 && source
              ? `${garment.styleNumber} created with ${garment.operationsCopied} operations copied from ${source.styleNumber}.`
              : `${garment.styleNumber} created. Add the first operation to start the sequence.`
        })
      });
    },
    onError: (caught: unknown) => {
      setError(caught instanceof ApiError ? caught.message : 'The garment could not be created.');
    }
  });

  function updateRow(index: number, patch: Partial<FabricRow>): void {
    setRows(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  }

  function togglePart(index: number, part: string): void {
    const row = rows[index];
    if (!row) return;
    updateRow(index, {
      parts: row.parts.includes(part)
        ? row.parts.filter((entry) => entry !== part)
        : [...row.parts, part]
    });
  }

  function addCustomPart(index: number): void {
    const row = rows[index];
    if (!row) return;
    const part = row.custom.trim();
    if (part === '' || row.parts.includes(part)) {
      updateRow(index, { custom: '' });
      return;
    }
    updateRow(index, { parts: [...row.parts, part], custom: '' });
  }

  function removeRow(index: number): void {
    const remaining = rows.filter((_row, position) => position !== index);
    // Removing the last row leaves one empty row.
    setRows(remaining.length === 0 ? [BLANK_ROW] : remaining);
  }

  const fabricById = new Map((fabrics.data?.items ?? []).map((fabric) => [fabric.id, fabric]));
  const assigned = rows.filter((row) => row.fabricId !== '');
  const partTotal = assigned.reduce((total, row) => total + row.parts.length, 0);

  /** Validation, in the documented order, one message at a time. */
  function validate(): string | null {
    if (name.trim() === '') return 'Garment name is required.';
    if (styleNumber.trim() === '') return 'Style number is required.';
    const clash = (garments.data?.items ?? []).find(
      (garment) => garment.styleNumber.toUpperCase() === styleNumber.trim().toUpperCase()
    );
    if (clash) return `Style number ${clash.styleNumber} already exists.`;
    if (buyer.trim() === '') return 'Buyer is required — the order and both sheets are addressed to them.';
    if (!hasQuantity || !Number.isInteger(quantity)) {
      return 'Order quantity must be a positive number of pieces.';
    }
    const wastage = Number(wastagePercent);
    if (!Number.isFinite(wastage) || wastage < 0 || wastage > 40) {
      return 'Wastage must be between 0 and 40 per cent.';
    }
    if (assigned.length === 0) return 'Assign at least one fabric.';
    for (const row of assigned) {
      if (row.parts.length === 0) {
        const fabric = fabricById.get(row.fabricId);
        return `${fabric?.name ?? 'That fabric'} has no garment part assigned.`;
      }
    }
    return null;
  }

  function submit(): void {
    const failure = validate();
    if (failure) {
      setError(failure);
      return;
    }
    setError('');

    create.mutate({
      name: name.trim(),
      styleNumber: styleNumber.trim().toUpperCase(),
      buyer: buyer.trim(),
      orderQuantity: quantity,
      wastagePercent: Number(wastagePercent),
      fabrics: assigned.map((row) => ({ fabricId: row.fabricId, parts: row.parts })),
      status,
      ...(garmentType.trim() ? { garmentType: garmentType.trim() } : {}),
      ...(season.trim() ? { season: season.trim() } : {}),
      ...(sizeRange.trim() ? { sizeRange: sizeRange.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(startFromCopy && copyFrom ? { copyOperationsFrom: copyFrom } : {})
    });
  }

  return (
    <Screen>
      <ScreenHeader title="New garment" subline="Style identity, fabrics and a starting point" />

      <div className={styles.layout}>
        <div className={styles.left}>
          <Card>
            <CardHeader title="Style identity" />
            <CardBody>
              <div className={styles.identityGrid}>
                <Field label="Garment name" htmlFor="ng-name">
                  <input
                    id="ng-name"
                    className={fieldStyles.input}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <Field label="Style number" htmlFor="ng-style">
                  <input
                    id="ng-style"
                    className={`${fieldStyles.input} ${fieldStyles.mono}`}
                    value={styleNumber}
                    onChange={(event) => setStyleNumber(event.target.value.toUpperCase())}
                  />
                </Field>
                <Field label="Garment type" htmlFor="ng-type">
                  <input
                    id="ng-type"
                    className={fieldStyles.input}
                    value={garmentType}
                    onChange={(event) => setGarmentType(event.target.value)}
                  />
                </Field>
                <Field label="Buyer" htmlFor="ng-buyer">
                  <input
                    id="ng-buyer"
                    className={fieldStyles.input}
                    value={buyer}
                    onChange={(event) => setBuyer(event.target.value)}
                  />
                </Field>
                <Field label="Season" htmlFor="ng-season">
                  <input
                    id="ng-season"
                    className={fieldStyles.input}
                    value={season}
                    onChange={(event) => setSeason(event.target.value)}
                  />
                </Field>
                <Field label="Size range" htmlFor="ng-size">
                  <input
                    id="ng-size"
                    className={fieldStyles.input}
                    value={sizeRange}
                    onChange={(event) => setSizeRange(event.target.value)}
                  />
                </Field>
                <Field label="Order quantity pcs" htmlFor="ng-qty">
                  <input
                    id="ng-qty"
                    className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
                    inputMode="numeric"
                    value={orderQuantity}
                    onChange={(event) => setOrderQuantity(event.target.value)}
                  />
                </Field>
                <Field label="Thread wastage %" htmlFor="ng-wastage">
                  <input
                    id="ng-wastage"
                    className={`${fieldStyles.input} ${fieldStyles.mono} ${fieldStyles.right}`}
                    inputMode="decimal"
                    value={wastagePercent}
                    onChange={(event) => setWastagePercent(event.target.value)}
                  />
                </Field>
                <Field label="Status" htmlFor="ng-status">
                  <select
                    id="ng-status"
                    className={fieldStyles.select}
                    value={status}
                    onChange={(event) => setStatus(event.target.value as GarmentStatus)}
                  >
                    {GARMENT_STATUSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className={styles.fullWidth}>
                  <Field label="Description" htmlFor="ng-description">
                    <textarea
                      id="ng-description"
                      className={fieldStyles.textarea}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fabrics and garment parts" note="Each fabric needs at least one part" />
            <CardBody>
              {rows.map((row, index) => {
                const fabric = fabricById.get(row.fabricId);
                const takenElsewhere = new Set(
                  rows.filter((_row, position) => position !== index).map((other) => other.fabricId)
                );

                return (
                  <div key={index} className={styles.fabricRow}>
                    <div>
                      <select
                        className={fieldStyles.select}
                        value={row.fabricId}
                        aria-label={`Fabric ${index + 1}`}
                        onChange={(event) => updateRow(index, { fabricId: event.target.value })}
                      >
                        <option value="">Select a fabric</option>
                        {(fabrics.data?.items ?? [])
                          .filter((option) => !takenElsewhere.has(option.id))
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                      </select>
                      <div className={styles.fabricNote}>
                        {fabric
                          ? `${fabric.gsm === null ? '—' : fabric.gsm} gsm · ${fabric.colour} · ${fabric.supplier}`
                          : 'Pick from the fabric library'}
                      </div>
                    </div>

                    <div>
                      <div className={styles.partsLabel}>
                        Parts cut from it —{' '}
                        {row.parts.length === 0 ? 'none yet' : `${row.parts.length} selected`}
                      </div>
                      <div className={styles.chips}>
                        {[
                          ...SUGGESTED_PARTS,
                          ...row.parts.filter((part) => !SUGGESTED_PARTS.includes(part))
                        ].map((part) => (
                          <button
                            key={part}
                            type="button"
                            className={`${styles.chip} ${row.parts.includes(part) ? styles.chipActive : ''}`}
                            aria-pressed={row.parts.includes(part)}
                            onClick={() => togglePart(index, part)}
                          >
                            {part}
                          </button>
                        ))}
                      </div>
                      <div className={styles.customPart}>
                        <input
                          className={`${fieldStyles.input} ${styles.customInput}`}
                          placeholder="Another part"
                          aria-label={`Custom part for fabric ${index + 1}`}
                          value={row.custom}
                          onChange={(event) => updateRow(index, { custom: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addCustomPart(index);
                            }
                          }}
                        />
                        <Button onClick={() => addCustomPart(index)}>Add part</Button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={styles.removeRow}
                      aria-label={`Remove fabric ${index + 1}`}
                      onClick={() => removeRow(index)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              <div className={styles.addFabric}>
                <Button variant="invert" onClick={() => setRows([...rows, { ...BLANK_ROW }])}>
                  + Add fabric
                </Button>
                <span className={styles.addFabricNote}>
                  Missing a fabric?{' '}
                  <a href="/fabrics" onClick={(event) => { event.preventDefault(); navigate('/fabrics'); }}>
                    create it in the fabric library first
                  </a>
                  .
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className={styles.right}>
          <Card>
            <CardHeader title="Starting point" />
            <CardBody>
              <label className={`${styles.radioCard} ${!startFromCopy ? styles.radioCardActive : ''}`}>
                <span className={styles.radioHead}>
                  <input
                    type="radio"
                    name="starting-point"
                    checked={!startFromCopy}
                    onChange={() => setStartFromCopy(false)}
                  />
                  Empty operation sequence
                </span>
                <span className={styles.radioBody}>
                  Build the sequence from scratch on the garment screen.
                </span>
              </label>

              <label className={`${styles.radioCard} ${startFromCopy ? styles.radioCardActive : ''}`}>
                <span className={styles.radioHead}>
                  <input
                    type="radio"
                    name="starting-point"
                    checked={startFromCopy}
                    onChange={() => setStartFromCopy(true)}
                  />
                  Copy operations from a style
                </span>
                <span className={styles.radioBody}>
                  Machines, seam lengths and thread positions come across, ready to adjust.
                </span>

                {startFromCopy ? (
                  <div className={styles.copyBlock}>
                    <select
                      className={fieldStyles.select}
                      value={copyFrom}
                      aria-label="Copy operations from"
                      onChange={(event) => setCopyFrom(event.target.value)}
                    >
                      <option value="">Select a style</option>
                      {copySources.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.styleNumber} · {option.name} · {option.operationCount} ops
                        </option>
                      ))}
                    </select>
                    {source ? (
                      <span className={styles.addFabricNote}>
                        Copying <Num value={source.operationCount} /> operations from{' '}
                        {source.styleNumber}{' '}
                        {hasQuantity ? (
                          <>
                            — about <Num value={estimate.data?.totalCones ?? null} /> cones at{' '}
                            <Num value={quantity} /> pcs.
                          </>
                        ) : (
                          '— enter an order quantity to estimate cones.'
                        )}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </label>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Will be created" />
            <CardBody>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Style</span>
                <span className={`${styles.summaryValue} mono`}>{styleNumber || '—'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Garment</span>
                <span className={styles.summaryValue}>{name || '—'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Fabrics</span>
                <span className={styles.summaryValue}>
                  <Num value={assigned.length} /> · <Num value={partTotal} /> parts
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Operations</span>
                <span className={styles.summaryValue}>
                  {startFromCopy && source ? (
                    <>
                      <Num value={source.operationCount} /> copied
                    </>
                  ) : (
                    'none yet'
                  )}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Cones, estimated</span>
                <span className={`${styles.summaryValue} mono`}>
                  <Num value={startFromCopy && hasQuantity ? estimate.data?.totalCones ?? null : null} />
                </span>
              </div>

              {error ? (
                <div className={styles.errorBox} role="alert">
                  {error}
                </div>
              ) : null}

              <Button variant="ink" full onClick={submit} disabled={create.isPending}>
                Create garment
              </Button>
              <div className={styles.submitNote}>
                Opens the garment screen so you can lay out the operation sequence.
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Screen>
  );
}
