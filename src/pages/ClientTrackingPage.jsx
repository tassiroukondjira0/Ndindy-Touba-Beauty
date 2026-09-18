import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  searchClientReservationsAndOrders, 
  getClientTrackedRecords 
} from '../services/db';
import { 
  Search, 
  Calendar, 
  Clock, 
  ShoppingBag, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock3, 
  XCircle, 
  Printer, 
  MapPin, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileText
} from 'lucide-react';

export const ClientTrackingPage = ({ initialQuery = '', onOpenBooking, navigateTo }) => {
  const { language, t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'reservations' | 'orders'
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Results
  const [searchResults, setSearchResults] = useState({ reservations: [], orders: [] });
  const [recentTracked, setRecentTracked] = useState({ reservations: [], orders: [] });
  const [hasRecent, setHasRecent] = useState(false);

  // Load auto-tracked items on this device on mount
  const loadRecentItems = async () => {
    try {
      const tracked = await getClientTrackedRecords();
      setRecentTracked(tracked);
      if (tracked.reservations.length > 0 || tracked.orders.length > 0) {
        setHasRecent(true);
      }
    } catch (e) {
      console.warn("Could not load tracked items:", e);
    }
  };

  useEffect(() => {
    loadRecentItems();
    if (initialQuery) {
      handleSearchSubmit(null, initialQuery);
    }
  }, [initialQuery]);

  const handleSearchSubmit = async (e, queryToUse) => {
    if (e) e.preventDefault();
    const query = (queryToUse !== undefined ? queryToUse : searchTerm).trim();
    if (!query) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const results = await searchClientReservationsAndOrders(query);
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults({ reservations: [], orders: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setHasSearched(false);
    setSearchResults({ reservations: [], orders: [] });
  };

  // Determine which list to display (search results if searched, otherwise recent device items)
  const isDisplayingSearch = hasSearched;
  const currentReservations = isDisplayingSearch ? searchResults.reservations : recentTracked.reservations;
  const currentOrders = isDisplayingSearch ? searchResults.orders : recentTracked.orders;

  const totalReservations = currentReservations.length;
  const totalOrders = currentOrders.length;
  const totalItemsCount = totalReservations + totalOrders;

  const getReservationStatusBadge = (status) => {
    switch (status) {
      case 'confirmée':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#4ade80',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <CheckCircle2 size={15} />
            {language === 'fr' ? 'Confirmée & Validée' : 'Confirmed & Validated'}
          </span>
        );
      case 'annulée':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <XCircle size={15} />
            {language === 'fr' ? 'Annulée' : 'Cancelled'}
          </span>
        );
      case 'en_attente':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#facc15',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <Clock3 size={15} />
            {language === 'fr' ? 'En attente de confirmation' : 'Pending Confirmation'}
          </span>
        );
    }
  };

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'validée':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            color: '#4ade80',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <CheckCircle2 size={15} />
            {language === 'fr' ? 'Validée & En Préparation' : 'Validated & Preparing'}
          </span>
        );
      case 'refusée':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <XCircle size={15} />
            {language === 'fr' ? 'Non validée / Refusée' : 'Declined'}
          </span>
        );
      case 'en_attente':
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#facc15',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <Clock3 size={15} />
            {language === 'fr' ? 'En attente de validation' : 'Pending Validation'}
          </span>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '80px', minHeight: '85vh' }}>
      <div className="section-container" style={{ maxWidth: '1000px' }}>
        
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="tag-badge" style={{ marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>{t('tracking_tag')}</span>
          </div>
          <h1 className="font-serif text-gold" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700, marginBottom: '14px' }}>
            {t('tracking_title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
            {t('tracking_subtitle')}
          </p>
        </div>

        {/* Search Box Card */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '24px 28px', 
            marginBottom: '36px', 
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)'
          }}
        >
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px', position: 'relative' }}>
              <Search size={18} color="var(--gold-primary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t('tracking_search_placeholder')}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  borderRadius: '30px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border 0.2s'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !searchTerm.trim()}
              className="bg-gold-gradient"
              style={{
                padding: '14px 28px',
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: !searchTerm.trim() ? 'not-allowed' : 'pointer',
                opacity: !searchTerm.trim() ? 0.7 : 1
              }}
            >
              {isLoading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              <span>{t('tracking_search_btn')}</span>
            </button>
          </form>

          {/* Quick tips */}
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <HelpCircle size={14} color="var(--gold-primary)" />
            <span>
              {language === 'fr' 
                ? 'Exemples de recherche : "TN-940218", "CMD-10492", ou votre numéro de téléphone.' 
                : 'Search examples: "TN-940218", "CMD-10492", or your phone number.'}
            </span>
          </div>
        </div>

        {/* Status / Scope Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            {isDisplayingSearch ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className="font-serif text-gold" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {t('tracking_search_results_title')} "{searchTerm}"
                </h2>
                <button
                  onClick={handleClearSearch}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'var(--text-muted)',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {language === 'fr' ? 'Effacer la recherche' : 'Clear search'}
                </button>
              </div>
            ) : hasRecent ? (
              <div>
                <h2 className="font-serif text-gold" style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  {t('tracking_recent_title')}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {t('tracking_recent_subtitle')}
                </p>
              </div>
            ) : null}
          </div>

          {/* Tabs Filter */}
          {totalItemsCount > 0 && (
            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '24px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <button
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'all' ? 'var(--gold-primary)' : 'transparent',
                  color: activeTab === 'all' ? '#000' : 'var(--text-muted)'
                }}
              >
                {t('tracking_tab_all')} ({totalItemsCount})
              </button>
              <button
                onClick={() => setActiveTab('reservations')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'reservations' ? 'var(--gold-primary)' : 'transparent',
                  color: activeTab === 'reservations' ? '#000' : 'var(--text-muted)'
                }}
              >
                {t('tracking_tab_reservations')} ({totalReservations})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'orders' ? 'var(--gold-primary)' : 'transparent',
                  color: activeTab === 'orders' ? '#000' : 'var(--text-muted)'
                }}
              >
                {t('tracking_tab_orders')} ({totalOrders})
              </button>
            </div>
          )}
        </div>

        {/* Results Presentation */}
        {totalItemsCount === 0 ? (
          <div 
            className="glass-card" 
            style={{ 
              padding: '60px 24px', 
              textAlign: 'center', 
              border: '1px dashed rgba(212, 175, 55, 0.3)',
              marginBottom: '36px'
            }}
          >
            {isDisplayingSearch ? (
              <>
                <XCircle size={54} color="var(--gold-primary)" style={{ opacity: 0.6, margin: '0 auto 16px' }} />
                <h3 className="font-serif text-gold" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
                  {language === 'fr' ? 'Aucun résultat trouvé' : 'No Results Found'}
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                  {t('tracking_no_results')}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleClearSearch}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    {language === 'fr' ? 'Réessayer une autre recherche' : 'Try another search'}
                  </button>
                  {onOpenBooking && (
                    <button
                      onClick={onOpenBooking}
                      className="bg-gold-gradient"
                      style={{
                        padding: '10px 20px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer'
                      }}
                    >
                      {t('nav_book_btn')}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <FileText size={54} color="var(--gold-primary)" style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                <h3 className="font-serif text-gold" style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
                  {t('tracking_empty_state_title')}
                </h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  {t('tracking_empty_state_desc')}
                </p>
                {onOpenBooking && (
                  <button
                    onClick={onOpenBooking}
                    className="bg-gold-gradient"
                    style={{
                      padding: '12px 28px',
                      borderRadius: '30px',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Calendar size={18} />
                    <span>{t('nav_book_btn')}</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '48px' }}>
            
            {/* 1. RESERVATIONS LIST */}
            {(activeTab === 'all' || activeTab === 'reservations') && currentReservations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-primary)', fontWeight: 700, fontSize: '1.1rem' }}>
                  <Calendar size={20} />
                  <span>{language === 'fr' ? 'Rendez-vous de Tresses' : 'Braiding Appointments'} ({currentReservations.length})</span>
                </div>

                {currentReservations.map(res => (
                  <div
                    key={res.id}
                    className="glass-card"
                    style={{
                      padding: '24px',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    {/* Header line: Reference & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          backgroundColor: 'rgba(212, 175, 55, 0.12)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: 'var(--gold-light)'
                        }}>
                          {res.id}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {res.createdAt ? new Date(res.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>

                      <div>{getReservationStatusBadge(res.status)}</div>
                    </div>

                    {/* Main info row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                      {/* Service / Price */}
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {language === 'fr' ? 'Modèle / Prestation' : 'Style / Service'}
                        </div>
                        <div className="font-serif text-gold" style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '4px' }}>
                          {res.braidTitle}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', marginTop: '2px' }}>
                          ${res.price}
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {language === 'fr' ? 'Date & Heure du Rendez-vous' : 'Appointment Date & Time'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                          <Calendar size={16} color="var(--gold-primary)" />
                          <span>{res.date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-light)' }}>
                          <Clock size={16} color="var(--gold-primary)" />
                          <span>{res.time}</span>
                        </div>
                      </div>

                      {/* Client info & payment */}
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {language === 'fr' ? 'Coordonnées Client' : 'Client Details'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.9rem', color: '#fff' }}>
                          <User size={14} color="var(--gold-primary)" />
                          <span>{res.clientName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <Phone size={14} color="var(--gold-primary)" />
                          <span>{res.clientPhone}</span>
                        </div>
                        {res.paymentMethod && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--gold-light)', marginTop: '4px' }}>
                            💳 {t('tracking_payment_label')} : {res.paymentMethod === 'cash' ? t('tracking_cash_on_site') : res.paymentMethod.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes if any */}
                    {res.notes && (
                      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <strong>{language === 'fr' ? 'Notes du client :' : 'Client Notes:'}</strong> {res.notes}
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <a
                          href="tel:4438581400"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.25)',
                            color: 'var(--gold-light)',
                            padding: '6px 14px',
                            borderRadius: '16px',
                            fontSize: '0.82rem',
                            textDecoration: 'none',
                            fontWeight: 600
                          }}
                        >
                          <Phone size={14} />
                          <span>443-858-1400</span>
                        </a>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          📍 306 North Eutaw St, Baltimore MD
                        </span>
                      </div>

                      <button
                        onClick={handlePrint}
                        title={t('tracking_print_sheet')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Printer size={15} />
                        <span>{language === 'fr' ? 'Imprimer / Enregistrer' : 'Print / Save'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. ORDERS LIST */}
            {(activeTab === 'all' || activeTab === 'orders') && currentOrders.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: (activeTab === 'all' && currentReservations.length > 0) ? '16px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-primary)', fontWeight: 700, fontSize: '1.1rem' }}>
                  <ShoppingBag size={20} />
                  <span>{language === 'fr' ? 'Commandes de Produits & Parfums' : 'Product & Perfume Orders'} ({currentOrders.length})</span>
                </div>

                {currentOrders.map(ord => (
                  <div
                    key={ord.id}
                    className="glass-card"
                    style={{
                      padding: '24px',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    {/* Header line */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(212, 175, 55, 0.15)', paddingBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          backgroundColor: 'rgba(212, 175, 55, 0.12)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: 'var(--gold-light)'
                        }}>
                          {ord.id}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>

                      <div>{getOrderStatusBadge(ord.status)}</div>
                    </div>

                    {/* Client & Total info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {language === 'fr' ? 'Client' : 'Customer'}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginTop: '2px' }}>
                          {ord.clientName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          📞 {ord.clientPhone}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {language === 'fr' ? 'Montant Total' : 'Total Amount'}
                        </div>
                        <div className="font-serif text-gold" style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '2px' }}>
                          ${ord.total ? ord.total.toFixed(2) : '0.00'}
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        {language === 'fr' ? 'Articles Commandés' : 'Ordered Items'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(ord.items || []).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {item.image && (
                                <img src={item.image} alt={item.name} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                              )}
                              <span><strong>{item.quantity}x</strong> {item.name}</span>
                            </div>
                            <span className="font-serif text-gold" style={{ fontWeight: 700 }}>
                              ${item.price ? (item.price * item.quantity).toFixed(2) : '0.00'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--gold-light)' }}>
                        🔔 {language === 'fr' 
                          ? 'Retrait & règlement sur place au salon ou livraison selon accord.' 
                          : 'Pickup & payment at the salon or delivery per agreement.'}
                      </div>

                      <button
                        onClick={handlePrint}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Printer size={15} />
                        <span>{language === 'fr' ? 'Imprimer la commande' : 'Print Order'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* Assistance Card at Bottom */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '28px', 
            borderRadius: '16px', 
            border: '1px solid rgba(212, 175, 55, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div>
            <h3 className="font-serif text-gold" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>
              {t('tracking_help_title')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, maxWidth: '560px' }}>
              {t('tracking_help_desc')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a
              href="tel:4438581400"
              className="bg-gold-gradient"
              style={{
                padding: '10px 22px',
                borderRadius: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
                color: '#000'
              }}
            >
              <Phone size={16} />
              <span>443-858-1400</span>
            </a>

            {onOpenBooking && (
              <button
                onClick={onOpenBooking}
                style={{
                  padding: '10px 22px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: 'var(--gold-light)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                {t('nav_book_btn')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
