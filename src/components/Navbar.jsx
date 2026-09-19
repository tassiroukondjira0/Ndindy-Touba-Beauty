import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useClientAuth } from '../context/ClientAuthContext';
import { hasAdminAccount } from '../services/auth';
import { useAdminSession } from '../hooks/useAdminSession';
import { ClientNotificationBell } from './ClientNotificationBell';
import { ShoppingBag, Calendar, Globe, Sparkles, User, LogOut, Menu, X } from 'lucide-react';

export const Navbar = ({ cartCount, onOpenCart, onOpenBooking, currentPath, navigateTo }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { clientUser, authEnabled, authLoading, openAuth, signOutClient } = useClientAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const isAdminLoggedIn = useAdminSession();
  const [accountCreated, setAccountCreated] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1024px)').matches);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setAccountCreated(hasAdminAccount());
  }, [currentPath]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handleChange = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Base client navigation items
  const navItems = [
    { path: '/', label: t('nav_home') },
    { path: '/about', label: t('nav_about') },
    { path: '/braids', label: t('nav_braids') },
    { path: '/products', label: t('nav_products') },
    { path: '/tracking', label: t('nav_tracking') }
  ];

  // ONLY show Admin tab if admin is ALREADY logged in, or if no account exists yet (first setup)
  if (isAdminLoggedIn) {
    navItems.push({ path: '/admin', label: t('nav_admin') });
  } else if (!accountCreated) {
    navItems.push({ path: '/admin', label: t('nav_initial_setup') });
  }

  const handleNavigate = (path) => {
    setMobileOpen(false);
    navigateTo(path);
  };

  const renderNavLink = (item) => {
    const isActive = currentPath === item.path;
    return (
      <button
        key={item.path}
        onClick={() => handleNavigate(item.path)}
        style={{
          background: 'none',
          border: 'none',
          color: isActive ? 'var(--gold-primary)' : 'var(--text-main)',
          fontWeight: isActive ? 700 : 500,
          borderBottom: isActive ? '2px solid var(--gold-primary)' : '2px solid transparent',
          paddingBottom: '4px',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
      >
        {item.label}
      </button>
    );
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: 'all 0.3s ease',
        backgroundColor: isScrolled || mobileOpen ? 'rgba(11, 10, 14, 0.98)' : 'rgba(11, 10, 14, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: isScrolled ? '1px solid rgba(212, 175, 55, 0.25)' : '1px solid rgba(212, 175, 55, 0.1)',
        boxShadow: isScrolled ? '0 10px 30px rgba(0,0,0,0.5)' : 'none'
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        {/* Brand Logo */}
        <button
          onClick={() => handleNavigate('/')}
          style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', textAlign: 'left', cursor: 'pointer', flexShrink: 0 }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #d4af37 0%, #aa8620 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)'
            }}
          >
            <Sparkles size={22} color="#0b0a0e" />
          </div>
          <div className="brand-text">
            <div className="font-serif text-gold" style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.1, letterSpacing: '0.02em' }}>
              TOUBA NDINDY
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              African Hair Braiding
            </div>
          </div>
        </button>

        {/* Dynamic Nav Links (desktop) */}
        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '22px', fontSize: '0.9rem', fontWeight: 600 }}>
            {navItems.map(renderNavLink)}
          </nav>
        )}

        {/* Actions (Language Switcher, Cart, Booking CTA) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            title="Changer de langue / Change language"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: 'var(--gold-light)',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
          >
            <Globe size={15} />
            {!isMobile && <span>{language === 'fr' ? '🇫🇷 FR' : 'en EN'}</span>}
          </button>

          {/* Client Notification Bell (only for clients, not for the owner's dashboard) */}
          {!isAdminLoggedIn && !isMobile && <ClientNotificationBell navigateTo={navigateTo} />}

          {/* Cart Icon (hidden for the owner's dashboard) */}
          {!isAdminLoggedIn && (
            <button
              onClick={onOpenCart}
              style={{
                position: 'relative',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: 'var(--gold-primary)',
                    color: '#000',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Client Account (desktop) */}
          {!isMobile && authEnabled && !authLoading && (
            clientUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 6px 5px 14px', borderRadius: '22px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                <User size={15} color="var(--gold-primary)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {clientUser.fullName || clientUser.firstName || t('client_account_menu')}
                </span>
                <button
                  onClick={signOutClient}
                  title={t('client_btn_logout')}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.08)', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              // Only show the login button when truly a guest — never if the
              // client is connected, nor if the salon owner is already logged in
              // (the owner accesses his area via the Dashboard tab instead).
              !isAdminLoggedIn && (
                <button
                  onClick={() => openAuth('login')}
                  title={t('client_login_btn_nav')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 14px',
                    borderRadius: '22px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <User size={15} />
                  <span>{t('client_login_btn_nav')}</span>
                </button>
              )
            )
          )}

          {/* Book Appointment CTA (desktop + hidden on the owner's dashboard) */}
          {!isMobile && !isAdminLoggedIn && (
            <button
              onClick={onOpenBooking}
              className="bg-gold-gradient"
              style={{
                padding: '10px 20px',
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              <Calendar size={16} />
              <span>{t('nav_book_btn')}</span>
            </button>
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: '12px',
                background: currentPath === item.path ? 'rgba(212, 175, 55, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: currentPath === item.path ? 'var(--gold-primary)' : 'var(--text-main)',
                fontSize: '0.95rem',
                fontWeight: currentPath === item.path ? 700 : 500,
                border: currentPath === item.path ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid transparent'
              }}
            >
              {item.label}
            </button>
          ))}

          {/* Client area actions inside drawer */}
          {!isAdminLoggedIn && (
            <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(212, 175, 55, 0.15)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <ClientNotificationBell navigateTo={navigateTo} />

              {authEnabled && !authLoading && (
                clientUser ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '22px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
                    <User size={15} color="var(--gold-primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {clientUser.fullName || clientUser.firstName || t('client_account_menu')}
                    </span>
                    <button
                      onClick={signOutClient}
                      title={t('client_btn_logout')}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.08)', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <LogOut size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openAuth('login')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      padding: '12px 14px',
                      borderRadius: '22px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <User size={15} />
                    <span>{t('client_login_btn_nav')}</span>
                  </button>
                )
              )}

              <button
                onClick={() => { setMobileOpen(false); onOpenBooking(); }}
                className="bg-gold-gradient"
                style={{
                  padding: '14px 20px',
                  borderRadius: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.9rem'
                }}
              >
                <Calendar size={16} />
                <span>{t('nav_book_btn')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};