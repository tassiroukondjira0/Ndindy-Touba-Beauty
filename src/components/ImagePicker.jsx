import React, { useRef, useState } from 'react';
import { Check, Image as ImageIcon, Upload } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Photo picker for admin catalog forms. Photos come from the owner's device.
export const ImagePicker = ({ label, value, onChange }) => {
  const { language, t } = useLanguage();
  const [galleryImages, setGalleryImages] = useState([]);
  const galleryInputRef = useRef(null);
  const selected = Boolean(value && value.trim() !== '');

  const handleGallerySelection = (event) => {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    Promise.all(files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, path: String(reader.result || '') });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    }))).then(items => {
      setGalleryImages(previous => [...items.filter(Boolean), ...previous].slice(0, 30));
    });
    event.target.value = '';
  };

  return (
    <div>
      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
        {label}
      </label>
      <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGallerySelection} style={{ display: 'none' }} />
      <button type="button" onClick={() => galleryInputRef.current?.click()} style={{ width: '100%', padding: '10px 12px', marginBottom: '10px', borderRadius: '8px', backgroundColor: 'rgba(212,175,55,0.1)', border: '1px dashed rgba(212,175,55,0.45)', color: 'var(--gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700 }}>
        <Upload size={15} />
        <span>{language === 'fr' ? 'Autoriser l’accès à ma galerie' : 'Allow access to my gallery'}</span>
      </button>
      <div style={{ minHeight: '72px', maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '8px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: '6px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
        {galleryImages.map(image => {
          const isSelected = selected && value === image.path;
          return (
            <button key={image.path} type="button" onClick={() => onChange(image.path)} title={image.name} style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', border: isSelected ? '2px solid var(--gold-primary)' : '2px solid transparent', background: 'rgba(255,255,255,0.06)', padding: 0, cursor: 'pointer' }}>
              <img src={image.path} alt={image.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {isSelected && <span style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'var(--gold-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} strokeWidth={3} /></span>}
            </button>
          );
        })}
        {galleryImages.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.8rem' }}>
            <ImageIcon size={18} style={{ marginBottom: '4px' }} />
            <div>{t('admin_modal_image_no_images')}</div>
          </div>
        )}
      </div>
      {selected && <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--gold-light)', wordBreak: 'break-all' }}>✓ {value}</div>}
    </div>
  );
};
