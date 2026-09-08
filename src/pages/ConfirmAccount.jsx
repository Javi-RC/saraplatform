import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmAccount } from '../api/auth';

export default function ConfirmAccount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [msg, setMsg] = useState(() => t('auth.confirming'));
  const [status, setStatus] = useState('confirming');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setMsg(t('errors.tokenNotProvided'));
      setStatus('error');
      return;
    }

    let cancelled = false;
    let redirectTimer;

    confirmAccount(token)
      .then(() => {
        if (cancelled) return;
        setMsg(t('auth.accountConfirmedLogIn'));
        setStatus('confirmed');
        redirectTimer = setTimeout(() => navigate('/login'), 2000);
      })
      .catch((error) => {
        if (cancelled) return;
        const code = error?.response?.data?.error;
        if (code === 'TOKEN_EXPIRED_RESENT') {
          setMsg(t('auth.tokenExpiredResent'));
          setStatus('resent');
        } else {
          setMsg(t('errors.invalidOrExpiredToken'));
          setStatus('error');
        }
      });

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate]);

  return (
    <div style={{ maxWidth: 720, margin: '40px auto' }}>
      <p data-testid="confirm-message">{msg}</p>
      {(status === 'error' || status === 'resent') && (
        <button type="button" onClick={() => navigate('/login')}>
          {t('auth.returnToLogin')}
        </button>
      )}
    </div>
  );
}