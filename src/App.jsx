import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ClientAuthProvider } from './context/ClientAuthContext';
import { initDB } from './services/db';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { BraidsPage } from './pages/BraidsPage';
import { ProductsPage } from './pages/ProductsPage';
import { ClientTrackingPage } from './pages/ClientTrackingPage';
import { AdminPage } from './pages/AdminPage';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { CartDrawer } from './components/CartDrawer';
import { ClientNotificationWatcher } from './components/ClientNotificationWatcher';
import { ClientAuthModal } from './components/ClientAuthModal';

export const AppContent = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [trackingQuery, setTrackingQuery] = useState('');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [preselectedBraid, setPreselectedBraid] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    initDB();
  }, []);

  const navigateTo = (path, extraQuery = '') => {
    if (extraQuery) {
      setTrackingQuery(extraQuery);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id, newQty) => {
    if (newQty <= 0) {
      handleRemoveCartItem(id);
      return;
    }
    setCartItems(prev =>
      prev.map(item => item.id === id ? { ...item, quantity: newQty } : item)
    );
  };

  const handleRemoveCartItem = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleSelectBraidForBooking = (braid) => {
    setPreselectedBraid(braid);
    setIsBookingOpen(true);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/about':
        return <AboutPage />;
      case '/braids':
        return <BraidsPage onSelectBraidForBooking={handleSelectBraidForBooking} />;
      case '/products':
        return <ProductsPage onAddToCart={handleAddToCart} />;
      case '/tracking':
        return (
          <ClientTrackingPage 
            initialQuery={trackingQuery} 
            onOpenBooking={() => setIsBookingOpen(true)}
            navigateTo={navigateTo}
          />
        );
      case '/admin':
        return <AdminPage />;
      case '/':
      default:
        return (
          <HomePage 
            onOpenBooking={() => setIsBookingOpen(true)} 
            navigateTo={navigateTo}
          />
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentPath={currentPath}
        navigateTo={navigateTo}
        cartCount={cartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenBooking={() => {
          setPreselectedBraid(null);
          setIsBookingOpen(true);
        }}
      />

      <main style={{ flex: 1 }}>
        {renderCurrentPage()}
      </main>

      <Footer navigateTo={navigateTo} />

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        preselectedBraid={preselectedBraid}
        navigateTo={navigateTo}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        navigateTo={navigateTo}
      />

      {/* Watches for reservation/order status updates and alerts this visitor */}
      <ClientNotificationWatcher />
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <ClientAuthProvider>
        <AppContent />
        <ClientAuthModal />
      </ClientAuthProvider>
    </LanguageProvider>
  );
}

export default App;
