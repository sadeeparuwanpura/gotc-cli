import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import {
  createOrder,
  duplicateGarment,
  fetchCalculation,
  fetchGarment,
  fetchMachineTypes,
  fetchOperations,
  fetchOrders,
  fetchThreads,
  WHOLE_SET
} from '../../api/endpoints';
import { queryKeys } from '../../api/queryKeys';
import { usePermission } from '../../auth/usePermission';
import { Button } from '../../components/Button';
import { DataTable, Chips, tableStyles } from '../../components/DataTable';
import { MachineToken } from '../../components/MachineToken';
import { BlockedBanner, Notice } from '../../components/Notice';
import { Num } from '../../components/Num';
import { Card, CardBody, SectionHead } from '../../components/Screen';
import { GarmentStatusPill } from '../../components/StatusPill';
import { noticeState, useRouteNotice } from '../../lib/notice';
import type { IncompleteOperationRef } from '../../api/types';
import { OperationsSection } from './OperationsSection';
import { ThreadRequirement } from './ThreadRequirement';
import styles from './GarmentDetail.module.css';

export function GarmentDetail(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const routeNotice = useRouteNotice();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<IncompleteOperationRef[] | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const infoGate = usePermission('info');
  const operationsGate = usePermission('operations');
  const ordersGate = usePermission('orders');

  const garment = useQuery({
    queryKey: queryKeys.garment(id),
    queryFn: ({ signal }) => fetchGarment(id, signal),
    enabled: id !== ''
  });
  const calculation = useQuery({
    queryKey: queryKeys.garmentCalculation(id),
    queryFn: ({ signal }) => fetchCalculation(id, {}, signal),
    enabled: id !== ''
  });
  const operations = useQuery({
    queryKey: queryKeys.operations(id),
    queryFn: ({ signal }) => fetchOperations(id, signal),
    enabled: id !== ''
  });
  // The machine select, the legend and the thread select all need the whole set.
  const machineTypes = useQuery({
    queryKey: queryKeys.machineTypes(1, '', 200),
    queryFn: ({ signal }) => fetchMachineTypes(WHOLE_SET, signal)
  });
  const threads = useQuery({
    queryKey: queryKeys.threads(1, '', 200),
    queryFn: ({ signal }) => fetchThreads(WHOLE_SET, signal)
  });
  // Scoped by style number server-side, so it stays correct however many orders exist.
  const orders = useQuery({
    queryKey: queryKeys.orders('All', garment.data?.styleNumber ?? ''),
    queryFn: ({ signal }) => fetchOrders({ q: garment.data?.styleNumber }, signal),
    enabled: Boolean(garment.data?.styleNumber)
  });

  const duplicate = useMutation({
    mutationFn: () => duplicateGarment(id),
    onSuccess: (copy) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
      navigate(`/garments/${copy.id}`, {
        state: noticeState({
          variant: 'success',
          message: `Duplicated ${copy.sourceStyleNumber ?? ''} as ${copy.styleNumber} with ${copy.operationsCopied} operations. You are now on the copy.`
        })
      });
    },
    onError: (caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : 'The garment could not be duplicated.')
  });

  const order = useMutation({
    mutationFn: () => createOrder({ garmentId: id }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allOrders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allGarments });
      navigate(`/orders/${created.id}`, {
        state: noticeState({
          variant: 'success',
          message: `${created.code} created for ${created.styleNumber} — ${created.totalCones} cones.`
        })
      });
    },
    onError: (caught: unknown) => {
      if (caught instanceof ApiError && caught.code === 'INCOMPLETE_OPERATIONS') {
        const list = caught.details?.operations;
        setBlocked(Array.isArray(list) ? (list as IncompleteOperationRef[]) : []);
        return;
      }
      setError(caught instanceof ApiError ? caught.message : 'The cone order could not be created.');
    }
  });

  function toggleExpanded(operationId: string): void {
    const next = new Set(expandedIds);
    if (next.has(operationId)) next.delete(operationId);
    else next.add(operationId);
    setExpandedIds(next);
  }

  const loadFailure = garment.error ?? calculation.error;
  if (loadFailure) {
    return (
      <div className={styles.body}>
        <Notice variant="warning">
          {loadFailure instanceof ApiError ? loadFailure.message : 'That garment could not be loaded.'}
        </Notice>
      </div>
    );
  }

  if (!garment.data || !calculation.data) {
    // No page transitions and no motion on load: the sections appear once the numbers do.
    return <div className={styles.body} />;
  }

  const record = garment.data;
  const figures = calculation.data;
  const garmentOrders = (orders.data?.items ?? []).filter((entry) => entry.garmentId === record.id);
  const latestOrder = garmentOrders[0];

  const coneNote =
    figures.threadCount === 0
      ? 'no thread assigned yet'
      : `across ${figures.threadCount} thread types · ${figures.wastagePercent}% wastage · yield ${figures.threads[0]?.coneYieldM.toLocaleString('en-US') ?? '—'} m`;

  const incompleteNote =
    figures.operationCount === 0
      ? 'no operations yet'
      : figures.incompleteOperations.length === 0
        ? 'all threads assigned'
        : `${figures.incompleteOperations.length} incomplete`;

  return (
    <>
      <div className={styles.subHeader} data-print="hide">
        <div className={styles.subHeaderInner}>
          <div>
            <div className={styles.identity}>
              <h1 className={styles.garmentName}>{record.name}</h1>
              <span className={styles.styleNumber}>{record.styleNumber}</span>
              <GarmentStatusPill status={record.status} />
            </div>
            <div className={styles.meta}>
              <span className={styles.metaItem}>{record.garmentType}</span>
              <span className={styles.metaItem}>{record.buyer}</span>
              <span className={styles.metaItem}>{record.season}</span>
              <span className={styles.metaItem}>
                Order <span className={styles.metaFigure}>{record.orderQuantity.toLocaleString('en-US')}</span> pcs
              </span>
              <span className={styles.metaItem}>
                Wastage <span className={styles.metaFigure}>{record.wastagePercent}%</span>
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <Button
              onClick={() => duplicate.mutate()}
              disabled={!infoGate.can || duplicate.isPending}
              {...(infoGate.can ? {} : { title: infoGate.hint })}
            >
              Duplicate garment
            </Button>
            <Button variant="outline" onClick={() => navigate(`/garments/${record.id}/breakdown`)}>
              Operation breakdown
            </Button>
            <Button
              variant="ink"
              onClick={() => {
                setBlocked(null);
                order.mutate();
              }}
              disabled={order.isPending || !ordersGate.can}
              {...(ordersGate.can ? {} : { title: ordersGate.hint })}
            >
              Create thread cone order
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {blocked ? (
          <BlockedBanner
            operations={blocked}
            onJump={(operationId) => {
              setExpandedIds(new Set(expandedIds).add(operationId));
              document.getElementById('operations')?.scrollIntoView({ block: 'start' });
            }}
            onBreakdown={() => navigate(`/garments/${record.id}/breakdown`)}
          />
        ) : null}

        {routeNotice ? <Notice variant={routeNotice.variant}>{routeNotice.message}</Notice> : null}
        {notice ? <Notice variant="success">{notice}</Notice> : null}
        {error ? <Notice variant="warning">{error}</Notice> : null}

        <div className={styles.summary}>
          <div className={styles.conePanel}>
            <div className={styles.coneLabel}>Cones to order</div>
            <div className={styles.coneFigure}>
              <span className={styles.coneValue}>
                <Num value={figures.totalCones} flash />
              </span>
              <span className={styles.coneUnit}>cones</span>
            </div>
            <div className={styles.coneNote}>{coneNote}</div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Operations</div>
              <div className={styles.statValue}>
                <Num value={figures.operationCount} flash />
              </div>
              <div className={styles.statNote}>{incompleteNote}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Machine types used</div>
              <div className={styles.statValue}>
                <Num value={figures.machineTypesUsed.length} />
              </div>
              <div className={styles.statTokens}>
                {figures.machineTypesUsed.map((machine) => (
                  <MachineToken key={machine.id} colour={machine.colour} name={machine.name} wide />
                ))}
              </div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Thread length, order</div>
              <div className={styles.statValue}>
                <Num value={figures.totalMetres} flash />
              </div>
              <div className={styles.statNote}>metres, incl. wastage</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Thread types</div>
              <div className={styles.statValue}>
                <Num value={figures.threadCount} />
              </div>
              <div className={styles.statNote}>
                {figures.threads.map((thread) => thread.ticket).join(' · ') || '—'}
              </div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Cone orders</div>
              <div className={styles.statValue}>
                <Num value={garmentOrders.length} />
              </div>
              <div className={styles.statNote}>
                {latestOrder ? `${latestOrder.code} · ${latestOrder.status}` : 'none created'}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.layout}>
          <nav className={styles.rail} aria-label="Sections on this garment">
            {[
              ['Garment information', 'garment-information', null],
              ['Fabrics', 'fabrics', record.fabrics.length],
              ['Operations', 'operations', figures.operationCount],
              ['Thread requirement', 'thread-requirement', figures.threadCount]
            ].map(([label, anchor, count]) => (
              <button
                key={anchor as string}
                type="button"
                className={styles.railLink}
                onClick={() =>
                  document.getElementById(anchor as string)?.scrollIntoView({ block: 'start' })
                }
              >
                <span>{label as string}</span>
                {count !== null ? <span className={styles.railCount}>{count as number}</span> : null}
              </button>
            ))}
          </nav>

          <div className={styles.sections}>
            <section id="garment-information">
              <SectionHead
                title="Garment information"
                hint={infoGate.can ? undefined : infoGate.hint}
              />
              <Card>
                <CardBody>
                  <div className={styles.infoGrid}>
                    {[
                      ['Garment type', record.garmentType, false],
                      ['Style number', record.styleNumber, true],
                      ['Buyer', record.buyer, false],
                      ['Season', record.season, false],
                      ['Order quantity', record.orderQuantity.toLocaleString('en-US'), true],
                      ['Size range', record.sizeRange, false],
                      ['Status', record.status, false],
                      ['Wastage', `${record.wastagePercent}%`, true]
                    ].map(([label, value, mono]) => (
                      <div key={label as string} className={styles.infoItem}>
                        <span className={styles.infoLabel}>{label as string}</span>
                        <span className={`${styles.infoValue} ${mono ? 'mono' : ''}`}>
                          {value as string}
                        </span>
                      </div>
                    ))}
                    <div className={`${styles.infoItem} ${styles.infoFull}`}>
                      <span className={styles.infoLabel}>Description</span>
                      <span className={styles.infoValue}>{record.description || '—'}</span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </section>

            <section id="fabrics">
              <SectionHead
                title={
                  <>
                    Fabrics <span className="mono">{record.fabrics.length}</span>
                  </>
                }
              />
              <DataTable hoverRows>
                <thead>
                  <tr>
                    <th>Fabric</th>
                    <th>Composition</th>
                    <th className={tableStyles.right}>GSM</th>
                    <th>Colour</th>
                    <th>Supplier</th>
                    <th>Garment parts</th>
                  </tr>
                </thead>
                <tbody>
                  {record.fabrics.map((fabric) => (
                    <tr key={fabric.id}>
                      <td className={tableStyles.strong}>{fabric.name}</td>
                      <td>{fabric.composition}</td>
                      <td className={`${tableStyles.right} ${tableStyles.mono}`}>
                        <Num value={fabric.gsm} />
                      </td>
                      <td>{fabric.colour}</td>
                      <td>{fabric.supplier}</td>
                      <td>
                        <Chips items={fabric.parts} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </section>

            <OperationsSection
              garmentId={record.id}
              operations={operations.data ?? []}
              machineTypes={machineTypes.data?.items ?? []}
              threads={threads.data?.items ?? []}
              machineChangeovers={figures.machineChangeovers}
              gate={operationsGate}
              expandedIds={expandedIds}
              onToggleExpanded={toggleExpanded}
              onNotice={setNotice}
              onError={setError}
            />

            <ThreadRequirement
              garment={record}
              calculation={figures}
              infoGate={infoGate}
              onError={setError}
            />
          </div>
        </div>
      </div>
    </>
  );
}
