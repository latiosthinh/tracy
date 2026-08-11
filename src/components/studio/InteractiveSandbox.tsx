import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  CreditCard,
  User,
  Smartphone,
  Headphones,
  Laptop,
  Star,
  Tag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { InspectedElement, SelectorType } from '../../types/autoflow';

interface InteractiveSandboxProps {
  inspectMode: boolean;
  recordMode?: boolean;
  onElementInspected?: (element: InspectedElement) => void;
  onRecordInteraction?: (interaction: { command: string; value: string; selector?: string; details?: string }) => void;
  activePath: string;
  onNavigate?: (path: string) => void;
  viewportWidth?: number;
  highlightSelector?: string;
  activeStepIndex?: number;
  areaScreenshotMode?: boolean;
  onCaptureScreenshot?: (type: 'area' | 'full-page', details?: string) => void;
  onCompleteAreaScreenshot?: () => void;
  triggerFullPageScreenshot?: boolean;
}

export const InteractiveSandbox: React.FC<InteractiveSandboxProps> = ({
  inspectMode,
  recordMode,
  onElementInspected,
  onRecordInteraction,
  activePath,
  onNavigate,
  viewportWidth,
  highlightSelector,
  areaScreenshotMode,
  onCaptureScreenshot,
  onCompleteAreaScreenshot,
  triggerFullPageScreenshot,
}) => {
  // Mock Target App State
  const [currentPath, setCurrentPath] = useState(activePath || '/products');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<{ id: string; title: string; price: number; image: string }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Screenshot & Camera Flash State
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [screenshotToast, setScreenshotToast] = useState<string | null>(null);
  const [showCameraFlash, setShowCameraFlash] = useState(false);

  useEffect(() => {
    if (triggerFullPageScreenshot) {
      setShowCameraFlash(true);
      setScreenshotToast('📸 Full page screenshot captured and added to flow steps!');
      const timer1 = setTimeout(() => setShowCameraFlash(false), 300);
      const timer2 = setTimeout(() => setScreenshotToast(null), 3500);
      if (onCaptureScreenshot) onCaptureScreenshot('full-page');
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [triggerFullPageScreenshot]);
  
  // Checkout Form State
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [country, setCountry] = useState('US');
  const [shippingAddress, setShippingAddress] = useState('');
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Profile API Mock State
  const [profileData, setProfileData] = useState<{ name: string; membership: string; balance: string } | null>(null);

  // Sync active path from prop
  useEffect(() => {
    if (activePath) {
      setCurrentPath(activePath);
    }
  }, [activePath]);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    if (onNavigate) onNavigate(path);
    if (recordMode && onRecordInteraction) {
      onRecordInteraction({
        command: 'navigate',
        value: path,
        details: `Navigated to ${path}`,
      });
      setScreenshotToast(`🔴 Recorded: navigate to "${path}"`);
      setTimeout(() => setScreenshotToast(null), 2500);
    }
  };

  // Inspector element handler
  const handleInspectClick = (e: React.MouseEvent, elemData: {
    tagName: string;
    text: string;
    id?: string;
    testId?: string;
    role?: string;
    label?: string;
    placeholder?: string;
    className?: string;
  }) => {
    if (!inspectMode) return;
    e.stopPropagation();
    e.preventDefault();

    const targetElem = e.currentTarget as HTMLElement;
    const rect = targetElem.getBoundingClientRect();

    const suggestedSelectors: InspectedElement['suggestedSelectors'] = [];

    if (elemData.testId) {
      suggestedSelectors.push({
        type: 'testId',
        value: elemData.testId,
        description: 'Target by explicit data-testid attribute',
        rating: 'best',
        yamlSnippet: `- click:\n    testId: "${elemData.testId}"`,
      });
    }

    if (elemData.role && elemData.text) {
      suggestedSelectors.push({
        type: 'role',
        value: elemData.role,
        description: `Target by ARIA role (${elemData.role}) and accessible text`,
        rating: 'recommended',
        yamlSnippet: `- click:\n    role: "${elemData.role}"\n    name: "${elemData.text.trim()}"`,
      });
    }

    if (elemData.label) {
      suggestedSelectors.push({
        type: 'label',
        value: elemData.label,
        description: 'Target input by associated form label',
        rating: 'recommended',
        yamlSnippet: `- inputText:\n    selector:\n      label: "${elemData.label}"\n    text: "..."`,
      });
    }

    if (elemData.placeholder) {
      suggestedSelectors.push({
        type: 'placeholder',
        value: elemData.placeholder,
        description: 'Target input by placeholder string',
        rating: 'recommended',
        yamlSnippet: `- inputText:\n    selector:\n      placeholder: "${elemData.placeholder}"\n    text: "..."`,
      });
    }

    if (elemData.text && elemData.text.trim().length > 0 && elemData.text.trim().length < 40) {
      suggestedSelectors.push({
        type: 'text',
        value: elemData.text.trim(),
        description: 'Target by visible screen text',
        rating: 'recommended',
        yamlSnippet: `- click: "${elemData.text.trim()}"`,
      });
    }

    if (elemData.id) {
      suggestedSelectors.push({
        type: 'id',
        value: elemData.id,
        description: 'Target by HTML element ID',
        rating: 'fallback',
        yamlSnippet: `- click:\n    id: "${elemData.id}"`,
      });
    }

    if (elemData.className) {
      const firstClass = elemData.className.split(' ')[0];
      suggestedSelectors.push({
        type: 'css',
        value: `.${firstClass}`,
        description: 'Target by CSS selector',
        rating: 'fragile',
        yamlSnippet: `- click:\n    css: ".${firstClass}"`,
      });
    }

    const inspected: InspectedElement = {
      tagName: elemData.tagName.toLowerCase(),
      text: elemData.text.trim(),
      id: elemData.id,
      testId: elemData.testId,
      role: elemData.role || 'element',
      label: elemData.label,
      placeholder: elemData.placeholder,
      className: elemData.className,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      attributes: {
        ...(elemData.testId ? { 'data-testid': elemData.testId } : {}),
        ...(elemData.id ? { id: elemData.id } : {}),
        ...(elemData.role ? { role: elemData.role } : {}),
      },
      suggestedSelectors,
    };

    if (onElementInspected) {
      onElementInspected(inspected);
    }
  };

  const getInspectAttrs = (data: {
    tagName: string;
    text: string;
    id?: string;
    testId?: string;
    role?: string;
    label?: string;
    placeholder?: string;
    className?: string;
  }) => {
    return {
      'data-testid': data.testId,
      id: data.id,
      onClick: (e: React.MouseEvent) => handleInspectClick(e, data),
      className: `${data.className || ''} ${
        inspectMode
          ? 'cursor-crosshair outline-1 outline-dashed outline-sky-400 hover:outline-2 hover:outline-indigo-500 hover:bg-indigo-500/10 transition-all'
          : ''
      }`,
    };
  };

  const products = [
    {
      id: 'headphones-1',
      testId: 'product-card-headphones',
      addTestId: 'add-cart-headphones',
      title: 'Wireless Headphones',
      price: 149.99,
      category: 'Electronics',
      badge: 'Bestseller',
      icon: Headphones,
      desc: 'Active Noise Cancellation, 40h Battery, High-Fidelity Audio',
    },
    {
      id: 'laptop-1',
      testId: 'product-card-laptop',
      addTestId: 'add-cart-laptop',
      title: 'Pro Ultra Laptop 16"',
      price: 1299.00,
      category: 'Computers',
      badge: 'New',
      icon: Laptop,
      desc: 'M3 Pro chip, 32GB RAM, 1TB SSD, Liquid Retina Display',
    },
    {
      id: 'smartphone-1',
      testId: 'product-card-phone',
      addTestId: 'add-cart-phone',
      title: 'OLED SmartPhone 5G',
      price: 899.50,
      category: 'Mobile',
      badge: 'Popular',
      icon: Smartphone,
      desc: '120Hz AMOLED, Triple Camera System, All-Day Battery',
    },
  ];

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: typeof products[0]) => {
    setCartItems(prev => [...prev, { id: product.id, title: product.title, price: product.price, image: 'headphone' }]);
    setIsCartOpen(true);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'SUMMER25') {
      setCouponApplied(true);
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const orderNum = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOrderId(orderNum);
    setIsOrderConfirmed(true);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword !== 'Tracy2026!') {
      setLoginError('Invalid email or password');
      setIsLoggedIn(false);
    } else {
      setLoginError('');
      setIsLoggedIn(true);
      navigateTo('/dashboard');
    }
  };

  // Inspect click capture: Stops ALL site interactions when inspectMode is enabled, records interactions when recordMode is enabled
  const handleWrapperClickCapture = (e: React.MouseEvent) => {
    if (inspectMode) {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (!target) return;

      const text = target.innerText || target.getAttribute('aria-label') || target.getAttribute('placeholder') || target.tagName;
      const testId = target.getAttribute('data-testid') || undefined;
      const id = target.id || undefined;
      const role = target.getAttribute('role') || target.tagName.toLowerCase();

      handleInspectClick(e, {
        tagName: target.tagName,
        text: (text || '').trim().slice(0, 40),
        testId,
        id,
        role,
        className: target.className,
      });
      return;
    }

    if (recordMode && onRecordInteraction) {
      const target = (e.target as HTMLElement).closest('button, a, input, select, [data-testid], [role="button"]') || (e.target as HTMLElement);
      if (!target) return;

      const testId = target.getAttribute('data-testid');
      const id = target.id;
      const ariaLabel = target.getAttribute('aria-label');
      const placeholder = target.getAttribute('placeholder');
      const text = target.textContent?.trim().slice(0, 35) || ariaLabel || placeholder || target.tagName.toLowerCase();

      if (text && text.length > 0) {
        onRecordInteraction({
          command: 'click',
          value: text,
          selector: testId ? `[data-testid="${testId}"]` : id ? `#${id}` : undefined,
          details: `Clicked "${text}"`,
        });
        setScreenshotToast(`🔴 Recorded step: click "${text}"`);
        setTimeout(() => setScreenshotToast(null), 2000);
      }
    }
  };

  // Drag-to-select area screenshot handlers
  const handleMouseDownArea = (e: React.MouseEvent) => {
    if (!areaScreenshotMode) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionBox({ x1: x, y1: y, x2: x, y2: y });
    setIsSelectingArea(true);
  };

  const handleMouseMoveArea = (e: React.MouseEvent) => {
    if (!areaScreenshotMode || !isSelectingArea || !selectionBox) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setSelectionBox(prev => (prev ? { ...prev, x2: x, y2: y } : null));
  };

  const handleMouseUpArea = () => {
    if (!areaScreenshotMode || !isSelectingArea || !selectionBox) return;
    setIsSelectingArea(false);
    setShowCameraFlash(true);
    setTimeout(() => setShowCameraFlash(false), 250);

    const width = Math.abs(selectionBox.x2 - selectionBox.x1);
    const height = Math.abs(selectionBox.y2 - selectionBox.y1);
    setScreenshotToast(`📸 Captured area screenshot (${Math.round(width)}px × ${Math.round(height)}px)`);
    setTimeout(() => setScreenshotToast(null), 3500);

    if (onCaptureScreenshot) {
      onCaptureScreenshot('area', `crop_${Math.round(width)}x${Math.round(height)}.png`);
    }
    if (onCompleteAreaScreenshot) {
      onCompleteAreaScreenshot();
    }
    setSelectionBox(null);
  };

  return (
    <div
      onClickCapture={handleWrapperClickCapture}
      onMouseDown={handleMouseDownArea}
      onMouseMove={handleMouseMoveArea}
      onMouseUp={handleMouseUpArea}
      className={`w-full h-full bg-slate-50 text-slate-800 font-sans flex flex-col overflow-y-auto relative select-none ${
        areaScreenshotMode ? 'cursor-crosshair' : inspectMode ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Camera Flash Visual Effect */}
      {showCameraFlash && (
        <div className="absolute inset-0 z-50 bg-white opacity-80 transition-opacity duration-300 pointer-events-none" />
      )}

      {/* Screenshot Toast Banner */}
      {screenshotToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 text-amber-300 px-4 py-2 rounded-[6px] border border-amber-500/80 shadow-2xl font-mono text-xs font-bold flex items-center space-x-2 animate-bounce">
          <span>{screenshotToast}</span>
        </div>
      )}

      {/* Live Recording Mode Banner */}
      {recordMode && (
        <div className="bg-rose-950 text-rose-200 px-3.5 py-1.5 border-b border-rose-800 font-mono text-xs font-bold flex items-center justify-between shrink-0 shadow-inner z-20">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
            <span className="text-rose-300">RECORDING USER INTERACTIONS</span>
          </div>
          <span className="text-[11px] text-stone-300 font-normal">Click elements or navigate to record Playwright steps live</span>
        </div>
      )}

      {/* Area Selection Drag Box */}
      {areaScreenshotMode && selectionBox && (
        <div
          className="absolute border-2 border-cyan-400 bg-cyan-400/20 z-40 pointer-events-none shadow-xs"
          style={{
            left: `${Math.min(selectionBox.x1, selectionBox.x2)}px`,
            top: `${Math.min(selectionBox.y1, selectionBox.y2)}px`,
            width: `${Math.abs(selectionBox.x2 - selectionBox.x1)}px`,
            height: `${Math.abs(selectionBox.y2 - selectionBox.y1)}px`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-stone-900 text-cyan-300 px-1.5 py-0.5 text-[10px] font-mono rounded-xs border border-cyan-500/60">
            {Math.round(Math.abs(selectionBox.x2 - selectionBox.x1))}px × {Math.round(Math.abs(selectionBox.y2 - selectionBox.y1))}px
          </div>
        </div>
      )}
      {/* Target Web Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            {...getInspectAttrs({
              tagName: 'DIV',
              text: 'Tracy Shop',
              testId: 'brand-logo',
              role: 'banner',
            })}
            onClick={(e) => {
              if (inspectMode) handleInspectClick(e, { tagName: 'DIV', text: 'Tracy Shop', testId: 'brand-logo', role: 'banner' });
              else navigateTo('/products');
            }}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              WM
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-base">Tracy Shop</span>
          </div>

          <nav className="hidden md:flex items-center space-x-4 ml-6 text-sm font-medium">
            <button
              {...getInspectAttrs({ tagName: 'BUTTON', text: 'Products', role: 'link' })}
              onClick={() => navigateTo('/products')}
              className={`hover:text-indigo-600 ${currentPath.includes('/products') ? 'text-indigo-600 font-semibold' : 'text-slate-600'}`}
            >
              Products
            </button>
            <button
              {...getInspectAttrs({ tagName: 'BUTTON', text: 'Categories', role: 'link' })}
              onClick={() => navigateTo('/categories')}
              className={`hover:text-indigo-600 ${currentPath.includes('/categories') ? 'text-indigo-600 font-semibold' : 'text-slate-600'}`}
            >
              Categories
            </button>
            <button
              {...getInspectAttrs({ tagName: 'BUTTON', text: 'Profile', role: 'link' })}
              onClick={() => navigateTo('/profile')}
              className={`hover:text-indigo-600 ${currentPath.includes('/profile') ? 'text-indigo-600 font-semibold' : 'text-slate-600'}`}
            >
              Profile
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          {/* Cart Trigger */}
          <button
            {...getInspectAttrs({
              tagName: 'BUTTON',
              text: `Cart (${cartItems.length})`,
              testId: 'cart-button',
              role: 'button',
            })}
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center space-x-1"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs font-semibold hidden sm:inline">Cart</span>
            {cartItems.length > 0 && (
              <span
                {...getInspectAttrs({
                  tagName: 'SPAN',
                  text: cartItems.length.toString(),
                  testId: 'cart-badge',
                })}
                className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs"
              >
                {cartItems.length}
              </span>
            )}
          </button>

          {/* User Sign In button */}
          <button
            {...getInspectAttrs({
              tagName: 'BUTTON',
              text: isLoggedIn ? 'Dashboard' : 'Sign In',
              role: 'button',
              testId: 'nav-signin-btn',
            })}
            onClick={() => navigateTo(isLoggedIn ? '/dashboard' : '/login')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center space-x-1"
          >
            <User className="w-3.5 h-3.5" />
            <span>{isLoggedIn ? 'Dashboard' : 'Sign In'}</span>
          </button>

          {/* Mobile hamburger button */}
          <button
            {...getInspectAttrs({
              tagName: 'BUTTON',
              text: 'Menu',
              testId: 'mobile-hamburger-btn',
              role: 'button',
            })}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 md:hidden flex flex-col space-y-2 text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Categories</span>
          <button
            {...getInspectAttrs({ tagName: 'BUTTON', text: 'Electronics', role: 'link' })}
            onClick={() => {
              navigateTo('/category/electronics');
              setIsMobileMenuOpen(false);
            }}
            className="text-left py-1 text-slate-200 hover:text-white"
          >
            Electronics
          </button>
          <button
            {...getInspectAttrs({ tagName: 'BUTTON', text: 'Computers', role: 'link' })}
            onClick={() => {
              navigateTo('/category/computers');
              setIsMobileMenuOpen(false);
            }}
            className="text-left py-1 text-slate-200 hover:text-white"
          >
            Computers
          </button>
          <button
            {...getInspectAttrs({ tagName: 'BUTTON', text: 'Filter Products', role: 'button' })}
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-left py-1 text-indigo-400 font-semibold"
          >
            Filter Products
          </button>
        </div>
      )}

      {/* Main Page Render router */}
      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
        {currentPath.includes('/products') || currentPath === '/' || currentPath.includes('/category') ? (
          <div>
            {/* Title & Search bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1
                  {...getInspectAttrs({
                    tagName: 'H1',
                    text: 'Products - Tracy Shop',
                    role: 'heading',
                  })}
                  className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight"
                >
                  Products - Tracy Shop
                </h1>
                <p className="text-xs text-slate-500">Explore premium high-tech gear for E2E web automation testing</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  {...getInspectAttrs({
                    tagName: 'INPUT',
                    text: searchQuery,
                    placeholder: 'Search products...',
                    testId: 'search-input',
                  })}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(prod => {
                const IconComponent = prod.icon;
                return (
                  <div
                    key={prod.id}
                    {...getInspectAttrs({
                      tagName: 'DIV',
                      text: prod.title,
                      testId: prod.testId,
                      className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between',
                    })}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase tracking-wider">
                          {prod.category}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center space-x-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>4.9</span>
                        </span>
                      </div>

                      <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center text-slate-400">
                        <IconComponent className="w-12 h-12 text-indigo-500" />
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm mb-1">{prod.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{prod.desc}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-base font-extrabold text-slate-900">${prod.price.toFixed(2)}</span>
                      <button
                        {...getInspectAttrs({
                          tagName: 'BUTTON',
                          text: 'Add to Cart',
                          testId: prod.addTestId,
                          role: 'button',
                        })}
                        onClick={() => addToCart(prod)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-xs"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : currentPath.includes('/checkout') ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2
              {...getInspectAttrs({
                tagName: 'H2',
                text: 'Checkout',
                role: 'heading',
              })}
              className="text-xl font-bold text-slate-900 mb-4 flex items-center space-x-2"
            >
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>Checkout</span>
            </h2>

            {isOrderConfirmed ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h3
                  {...getInspectAttrs({ tagName: 'H3', text: 'Order Confirmed!', role: 'heading' })}
                  className="text-lg font-bold text-emerald-900 mb-1"
                >
                  Order Confirmed!
                </h3>
                <p className="text-xs text-emerald-700 mb-4">
                  Thank you for your test purchase. Your order has been placed successfully.
                </p>

                <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-emerald-300 shadow-2xs">
                  <span className="text-xs text-slate-500">Order Reference:</span>
                  <span
                    {...getInspectAttrs({
                      tagName: 'SPAN',
                      text: generatedOrderId,
                      id: 'order-id-badge',
                    })}
                    className="font-mono font-bold text-sm text-indigo-600"
                  >
                    {generatedOrderId}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-4">
                  Order #{generatedOrderId} has been created.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coupon & Form */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <button
                      {...getInspectAttrs({
                        tagName: 'BUTTON',
                        text: 'Have a coupon?',
                        role: 'button',
                      })}
                      className="text-xs font-semibold text-indigo-600 hover:underline flex items-center space-x-1 mb-2"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Have a coupon?</span>
                    </button>

                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        {...getInspectAttrs({
                          tagName: 'INPUT',
                          text: couponCode,
                          placeholder: 'Enter promo code',
                        })}
                        type="text"
                        placeholder="Enter promo code"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white"
                      />
                      <button
                        {...getInspectAttrs({
                          tagName: 'BUTTON',
                          text: 'Apply Coupon',
                          role: 'button',
                        })}
                        type="submit"
                        className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800"
                      >
                        Apply Coupon
                      </button>
                    </form>

                    {couponApplied && (
                      <p
                        {...getInspectAttrs({
                          tagName: 'P',
                          text: '25% Discount Applied!',
                        })}
                        className="text-xs font-bold text-emerald-600 mt-2 flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>25% Discount Applied!</span>
                      </p>
                    )}
                  </div>

                  <form onSubmit={handlePlaceOrder} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                      <input
                        {...getInspectAttrs({
                          tagName: 'INPUT',
                          text: fullName,
                          label: 'Full Name',
                        })}
                        type="text"
                        required
                        placeholder="Alex Rivera"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                      <input
                        {...getInspectAttrs({
                          tagName: 'INPUT',
                          text: emailAddress,
                          label: 'Email Address',
                        })}
                        type="email"
                        required
                        placeholder="alex.checkout@example.com"
                        value={emailAddress}
                        onChange={e => setEmailAddress(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                      <select
                        {...getInspectAttrs({
                          tagName: 'SELECT',
                          text: country,
                          id: 'country-select',
                        })}
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="UK">United Kingdom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Address</label>
                      <input
                        {...getInspectAttrs({
                          tagName: 'INPUT',
                          text: shippingAddress,
                          label: 'Shipping Address',
                        })}
                        type="text"
                        required
                        placeholder="742 Evergreen Terrace"
                        value={shippingAddress}
                        onChange={e => setShippingAddress(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>

                    <button
                      {...getInspectAttrs({
                        tagName: 'BUTTON',
                        text: 'Place Order',
                        role: 'button',
                      })}
                      type="submit"
                      className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 shadow-xs mt-2"
                    >
                      Place Order
                    </button>
                  </form>
                </div>

                {/* Cart Summary */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">Order Summary</h3>
                  {cartItems.length === 0 ? (
                    <p className="text-xs text-slate-500">Cart is empty. Add items from store.</p>
                  ) : (
                    <div className="space-y-2">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-200">
                          <span className="text-slate-700">{item.title}</span>
                          <span className="font-bold text-slate-900">${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="pt-2 flex justify-between text-xs font-extrabold text-slate-900">
                        <span>Total:</span>
                        <span>${cartItems.reduce((acc, i) => acc + i.price, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : currentPath.includes('/login') ? (
          <div className="max-w-md mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm my-8">
            <h1
              {...getInspectAttrs({
                tagName: 'H1',
                text: 'Sign In - Tracy Portal',
                role: 'heading',
              })}
              className="text-xl font-bold text-slate-900 mb-1"
            >
              Sign In - Tracy Portal
            </h1>
            <p className="text-xs text-slate-500 mb-4">Enter test credentials to authenticate session</p>

            {loginError && (
              <div
                {...getInspectAttrs({
                  tagName: 'DIV',
                  text: loginError,
                })}
                className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  {...getInspectAttrs({
                    tagName: 'INPUT',
                    text: loginEmail,
                    label: 'Email Address',
                  })}
                  type="email"
                  required
                  placeholder="alex.dev@example.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  {...getInspectAttrs({
                    tagName: 'INPUT',
                    text: loginPassword,
                    label: 'Password',
                  })}
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded-xs border-slate-300 text-indigo-600"
                />
                <button
                  {...getInspectAttrs({
                    tagName: 'BUTTON',
                    text: 'Remember me',
                    role: 'button',
                  })}
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Remember me
                </button>
              </div>

              <button
                {...getInspectAttrs({
                  tagName: 'BUTTON',
                  text: 'Sign In',
                  role: 'button',
                })}
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 shadow-xs"
              >
                Sign In
              </button>
            </form>
          </div>
        ) : currentPath.includes('/dashboard') ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h1
              {...getInspectAttrs({
                tagName: 'H1',
                text: 'Welcome back, Alex!',
                role: 'heading',
              })}
              className="text-2xl font-bold text-slate-900 mb-2"
            >
              Welcome back, Alex!
            </h1>
            <p className="text-xs text-slate-500 mb-6">User session authenticated successfully via E2E login flow.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <span className="text-xs text-indigo-600 font-semibold">Account Tier</span>
                <p className="text-lg font-bold text-indigo-900">VIP Pro</p>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <span className="text-xs text-emerald-600 font-semibold">Active Orders</span>
                <p className="text-lg font-bold text-emerald-900">3 Active</p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-xs text-amber-600 font-semibold">E2E Session Token</span>
                <p className="text-xs font-mono font-bold text-amber-900 truncate">wm_sess_948271</p>
              </div>
            </div>
          </div>
        ) : currentPath.includes('/profile') ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">User Profile & Network API Demo</h2>
            <div className="space-y-2 text-xs">
              <div {...getInspectAttrs({ tagName: 'DIV', text: 'Mocked Test User' })} className="p-2 bg-slate-50 rounded-md font-bold text-slate-800">
                Mocked Test User
              </div>
              <div {...getInspectAttrs({ tagName: 'DIV', text: 'VIP Platinum' })} className="p-2 bg-indigo-50 rounded-md font-semibold text-indigo-700">
                VIP Platinum
              </div>
              <div {...getInspectAttrs({ tagName: 'DIV', text: '$500.00' })} className="p-2 bg-emerald-50 rounded-md font-bold text-emerald-700">
                $500.00
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Slide-over Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-80 bg-white h-full shadow-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <h3 className="font-bold text-sm text-slate-900">Your Cart</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-1 text-slate-500 hover:text-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {cartItems.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Your cart is empty.</p>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-800">{item.title}</span>
                      <span className="font-bold text-slate-900">${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="pt-3 border-t border-slate-200">
                <button
                  {...getInspectAttrs({
                    tagName: 'BUTTON',
                    text: 'Proceed to Checkout',
                    role: 'button',
                  })}
                  onClick={() => {
                    setIsCartOpen(false);
                    navigateTo('/checkout');
                  }}
                  className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center space-x-1"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
