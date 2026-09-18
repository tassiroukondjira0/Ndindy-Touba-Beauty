import React, { useState, useMemo } from 'react';
import { Search, Image as ImageIcon, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import projectImages from 'virtual:project-images';

// Photo picker for the admin product/perfume/braid modals. Shows every image
// stored in public/assets as a thumbnail grid so the owner can click to choose
// instead of typing a path. A manual URL field stays available as a fallback.
export const ImagePicker = ({ label, value, onChange }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const images = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projectImages;
    return projectImages.filter(p => p.toLowerCase().includes(q));
  }, [query]);

  const selected = value && value.trim() !== '';

  return (
    <div>
      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
        {label}
      </label>

      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('admin_modal_image_search')}
          style={{
            width: '100%', padding: '9px 10px 9px 32px', borderRadius: '6px',
            backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)', color: '#fff', fontSize: '0.85rem'
          }}
        />
      </div>

      <div
        style={{
          maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(212,175,55,0.25)',
          borderRadius: '8px', padding: '8px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: '6px',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}
      >
        {images.map(path => {
          const isSelected = selected && value === path;
          return (
            <button
              key={path}
              type="button"
              onClick={() => onChange(path)}
              title={path.split('/').pop()}
              style={{
                position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden',
                border: isSelected ? '2px solid var(--gold-primary)' : '2px solid transparent',
                background: 'rgba(255,255,255,0.06)', padding: 0, cursor: 'pointer'
              }}
            >
              <img
                src={path}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {isSelected && (
                <span
                  style={{
                    position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%',
                    backgroundColor: 'var(--gold-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}

        {images.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.8rem' }}>
            <ImageIcon size={18} style={{ marginBottom: '4px' }} />
            <div>{t('admin_modal_image_no_images')}</div>
          </div>
        )}
      </div>

      {selected && (
        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--gold-light)', wordBreak: 'break-all' }}>
          ✓ {value}
        </div>
      )}
    </div>
  );
};