import type { MachineTypeDTO, MachineTypeToken } from '../api/types';
import styles from './MachineToken.module.css';

export function MachineToken({
  colour,
  name,
  wide = false
}: {
  colour: string;
  name: string;
  wide?: boolean;
}): JSX.Element {
  return (
    <span
      className={`${styles.token} ${wide ? styles.wide : ''}`}
      style={{ background: colour }}
      title={name}
    />
  );
}

export function MachineTokenRow({ machines }: { machines: MachineTypeToken[] }): JSX.Element {
  return (
    <span className={styles.row}>
      {machines.map((machine) => (
        <MachineToken key={machine.id} colour={machine.colour} name={machine.name} />
      ))}
    </span>
  );
}

/** The legend beside the operations heading: token + code, for every machine type. */
export function MachineLegend({ machineTypes }: { machineTypes: MachineTypeDTO[] }): JSX.Element {
  return (
    <div className={styles.legend}>
      {machineTypes.map((machine) => (
        <span key={machine.id} className={styles.legendItem}>
          <MachineToken colour={machine.colour} name={machine.name} wide />
          {machine.code}
        </span>
      ))}
    </div>
  );
}
