import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { useSession } from '../../auth/SessionProvider';
import { noticeState } from '../../lib/notice';
import styles from './SignIn.module.css';

/**
 * The counts on the ink panel are described as live, but every read needs a session, so
 * before sign-in there is nothing to count. They render with the system's em dash rather
 * than an invented public endpoint — see NOTES.md.
 */
const EM_DASH = '—';

export function SignIn(): JSX.Element {
  const { signIn } = useSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    if (email.trim() === '') {
      setError('Enter your email address.');
      return;
    }
    if (password === '') {
      setError('Enter your password.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const session = await signIn(email.trim(), password);
      navigate('/garments', {
        replace: true,
        state: noticeState({
          variant: 'success',
          message: `Signed in as ${session.user.name} · ${session.user.roleLabel}.`
        })
      });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Email or password is incorrect.'
      );
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.mark}>G</span>
          <span className={styles.wordmark}>GOTC</span>
        </div>

        <div>
          <h1 className={styles.headline}>Garment operation and thread cone planning</h1>
          <p className={styles.lede}>
            Sequence the operations, assign a thread to every machine position, and let the cone
            count follow from the seam lengths. One record from the sewing floor to the purchase
            order.
          </p>
          <div className={styles.counts}>
            <div>
              <div className={styles.countValue}>{EM_DASH}</div>
              <div className={styles.countLabel}>Styles</div>
            </div>
            <div>
              <div className={styles.countValue}>{EM_DASH}</div>
              <div className={styles.countLabel}>Operations</div>
            </div>
            <div>
              <div className={styles.countValue}>{EM_DASH}</div>
              <div className={styles.countLabel}>Cone orders</div>
            </div>
          </div>
        </div>

        <div className={styles.footnote}>Demonstration environment · no production data</div>
      </section>

      <section className={styles.formSide}>
        <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate>
          <h2 className={styles.heading}>Sign in</h2>
          <p className={styles.subline}>Your role decides what you can edit.</p>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="signin-email">
              Email
            </label>
            <input
              id="signin-email"
              className={styles.input}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="signin-password">
              Password
            </label>
            <input
              id="signin-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}

          <button className={styles.submit} type="submit" disabled={submitting}>
            Sign in
          </button>
        </form>
      </section>
    </div>
  );
}
