import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  addSubscriber,
  saveOrder,
  auth,
  app,
  db,
  listenToCollection,
  logActivity,
  setRewardState,
  getRewardState,
  ensureRewardDoc,
  ensureLoyaltyDoc,
  getLoyaltyState,
  redeemCartWithPoints,
  addPointsForUser,
} from './firebase';
import { TIERS, CURRENCY_NAME, REDEMPTION_VALUE_PER_POINT, nextTierProgress, formatRandValue } from './loyalty';
import LoginPage from './admin/LoginPage';
import AdminDashboard from './admin/AdminDashboard';
import ProtectedRoute from './admin/ProtectedRoute';
import { AuthProvider } from './admin/AuthContext';
import { useAuth } from './admin/AuthContext'; // at top
import {
  VALID_STAMP_CODES,
  REQUIRED_STAMP_COUNT,
  STAMP_DEFAULT_STATE,
  normalizeStampState,
  addStampToState,
  addNextMissingStamp,
  getStoredStampState,
  persistStampState,
  getCartItemCount,
} from './rewards';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useSearchParams,
  Navigate,
  Link,
  useParams,
} from 'react-router-dom';
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
// --- NEW CORRECTED IMPORTS ---
import logo from './assets/Website Logo.png';

// 1. Hero light trails background
import goldLines from './assets/Extended-lines.png';

// 2. The CEO (Francois)
import iconFrancois from './assets/Francois.jpg'; 

// 2. The COO (Rualdo)
import iconRualdo from './assets/Rualdo.jpg';

// 2. The Head 3D Designer 
import iconReinart from './assets/Reinart.jpg';

// 3. Cybersecurity Icon
import iconCyber from './assets/Cybersecurity.png';

// 4. Team Picture (About Section)
import teamPic from './assets/Team.jpg';

// --- OTHER ASSETS (Ensure these exist in your folder) ---
import iconSocial from './assets/Social Marketing.png';
import iconWeb from './assets/Web Development.png';
import iconPrinting from './assets/Printing.png';
import iconPhoto from './assets/Photography.png';

// Portfolio & Blog placeholders
import frontier1 from './assets/Frontier 1.jpg'
import frontier2 from './assets/Frontier 2.jpg'
import frontier3 from './assets/Frontier 3.jpg'
import frontier4 from './assets/Frontier 4.jpg'

import ironman1 from './assets/Ironman 1.jpg'
import ironman2 from './assets/Ironman 2.jpg'
import ironman3 from './assets/Ironman 3.jpg'
import ironman4 from './assets/Ironman 4.jpg'

import portfolio1 from './assets/project-1.jpg';
import portfolio3 from './assets/project-3.jpg';
import blog1 from './assets/blog-1.jpg';
import blog2 from './assets/blog-2.jpg';
import blog3 from './assets/blog-3.jpg';

// Profile Pictures
import profileSarah from './assets/profile-sarah.png';
import profileJohn from './assets/profile-john.png';
import profileJane from './assets/profile-jane.png';

// Locations
import iconMosselbay from './assets/Mosselbay.png';
import iconGeorge from './assets/George.png';
import iconKnysna from './assets/Knysna.png';
import iconPlettenberg from './assets/Plettenberg.png';
import iconHartenbos from './assets/Hartenbos.png';

// Team & Misc
import graphicCube from './assets/Blueprint.png';
import heroGif from './assets/Canva 1.png';
import digitalExcel from './assets/Ironman 2.jpg';
import Chatbot from "./components/Chatbot";
// Add this with your other image imports

// --- Global Styles Component ---
// All your custom CSS from the <head> is placed here.
// I've removed the .page-section rules as React now handles showing/hiding pages.
const GlobalStyles = () => (
  <style>{`
    /* 1. Base Settings - RESTORED TO NORMAL (White Text) */
    body {
        font-family: 'Inter', sans-serif;
        background-color: #06152f;
        color: #ffffff; /* Body text is White again */
        -webkit-font-smoothing: antialiased;
    }
   .yoco-frame-container, 
div[style*="z-index: 2147483647"] {
    z-index: 2147483647 !important;
    position: fixed !important;
}

/* Prevent Cart Items from fighting back */
.glass-card {
    /* Ensure these don't accidentally have a high z-index */
    z-index: 1; 
}
        
    /* 2. Color Utilities - RESTORED TO NORMAL */
    .text-custom-gold { color: #D4AF37 !important; } /* Accents are gold */
    .bg-custom-gold { background-color: #D4AF37; }
    .border-custom-gold { border-color: #D4AF37; }
    
    .bg-custom-dark { background-color: #06152f; }
    .bg-custom-gray { background-color: #0b1f44; }
    .bg-custom-card { background-color: #102a57; }

    /* Ensure specific white text classes remain white */
    .text-white { color: #ffffff !important; }

    /* 3. The Premium Glass Card */
    .glass-card {
      background: rgba(30, 30, 30, 0.6);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
      transition: all 0.4s ease;
    }
    .glass-card:hover {
      transform: translateY(-10px);
      border-color: #D4AF37; /* gold Border on Hover */
      box-shadow: 0 0 20px rgba(253, 190, 51, 0.2);
    }

    /* 4. Header & Nav */
    header { position: absolute; top: 0; left: 0; width: 100%; background: transparent; z-index: 40 }
    .nav-link {
        letter-spacing: 0.05em; font-size: 0.95rem; font-weight: 700; text-transform: uppercase;
        color: #ffffff; /* Links are White */
        opacity: 0.9; transition: all 0.3s ease;
    }
    .nav-link:hover, .nav-link.active { opacity: 1; color: #D4AF37; /* Hover is gold */ }

    /* 5. Utility & Animations */
    .hero-bg { background-size: cover; background-position: center; position: relative; }
    .hero-smoke-video { position: absolute; bottom: 0; left: 0; width: 100%; height: 100%; z-index: 5; opacity: 1; filter: grayscale(100%); mix-blend-mode: screen; object-fit: cover; object-position: bottom; pointer-events: none; }
    .cta-video-container { position: relative; overflow: hidden; }
    .cta-video-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; filter: grayscale(100%); mix-blend-mode: screen; object-position: bottom; }
    .cta-content { position: relative; z-index: 10; }

    @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }

    @keyframes graph-zero-zoom { 0% { opacity: 0; transform: scale(0.7); } 30% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0; transform: scale(1.25); } }
    @keyframes graph-zero-out { 0% { opacity: 0; transform: scale(0.7); } 18% { opacity: 1; transform: scale(1); } 36% { opacity: 1; transform: scale(1.05); } 48% { opacity: 0; transform: scale(1.2); } 100% { opacity: 0; transform: scale(1.2); } }
    @keyframes graph-line-draw { 0% { stroke-dashoffset: 360; opacity: 0; } 6% { opacity: 1; } 52% { stroke-dashoffset: 0; opacity: 1; } 60% { stroke-dashoffset: 0; opacity: 0; } 100% { stroke-dashoffset: 0; opacity: 0; } }
    @keyframes graph-layer-fade { 0% { opacity: 1; } 56% { opacity: 1; } 64% { opacity: 0; } 100% { opacity: 0; } }
    @keyframes graph-hero-in { 0% { opacity: 0; transform: scale(0.7); } 60% { opacity: 0; transform: scale(0.7); } 70% { opacity: 1; transform: scale(1.12); } 100% { opacity: 1; transform: scale(1.12); } }
    @keyframes graph-dot-in { 0% { opacity: 0; } 100% { opacity: 1; } }

    .client-graph-stage { position: relative; min-height: 180px; }
    .client-graph-stage .graph-line,
    .client-graph-stage .graph-dot,
    .client-graph-stage .graph-layer { opacity: 0; }
    .client-graph-stage.is-visible .graph-line { animation: graph-line-draw 6s ease infinite; }
    .client-graph-stage.is-visible .graph-layer { animation: graph-layer-fade 6s ease infinite; }
    .client-graph-stage.is-visible .graph-dot { animation: graph-dot-in 6s ease infinite; }
    .client-graph-stage.is-visible .graph-label-final { animation: graph-hero-in 6s ease infinite; }
    
    @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }
    .animate-marquee { display: inline-block; animation: marquee 60s linear infinite; white-space: nowrap; padding-left: 100%; }
    .marquee-container { overflow: hidden; white-space: nowrap; }
    .marquee-content > * { display: inline-block; padding-right: 3rem; }

    /* 8. Portfolio Duo Preview */
    .gallery-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid #2a2a2a;
      background: linear-gradient(135deg, rgba(20, 20, 20, 0.95), rgba(30, 30, 30, 0.6));
      position: relative;
      overflow: hidden;
    }
    .gallery-label {
      text-transform: uppercase;
      letter-spacing: 0.35em;
      font-size: 0.65rem;
      color: #b7b7b7;
      font-weight: 700;
      width: 150px;
      text-align: center;
      white-space: nowrap;
    }
    .gallery-button {
      background: #D4AF37;
      color: #111111;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      border-radius: 999px;
      padding: 12px 20px;
      width: clamp(180px, 30vw, 280px);
      transition: width 0.4s ease, transform 0.4s ease, box-shadow 0.4s ease;
      box-shadow: 0 10px 30px rgba(253, 190, 51, 0.2);
    }
    .gallery-bar:hover .gallery-button {
      width: calc(100% - 320px);
      transform: translateY(-4px);
      box-shadow: 0 12px 35px rgba(253, 190, 51, 0.35);
    }
    .portfolio-panel {
      position: relative;
      min-height: 360px;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: #121212;
    }
    .portfolio-panel-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.8));
      z-index: 2;
    }
    .portfolio-panel-content {
      position: absolute;
      inset: 0;
      z-index: 3;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 2rem;
      gap: 0.75rem;
    }
    .panel-cta {
      background: #D4AF37;
      color: #111111;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      padding: 10px 18px;
      border-radius: 999px;
      transition: transform 0.4s ease, box-shadow 0.4s ease;
      align-self: flex-start;
    }
    .portfolio-panel:hover .panel-cta {
      transform: translateY(-6px);
      box-shadow: 0 12px 28px rgba(253, 190, 51, 0.3);
    }
    .portfolio-folder {
      margin-top: -14px;
      padding: 32px 0 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0 0 24px 24px;
      background: #121212;
      position: relative;
      overflow: visible;
    }
    .portfolio-row {
      margin-bottom: 2.5rem;
      position: relative;
      z-index: 2;
    }
    .portfolio-row-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 16px 18px;
    }
    .portfolio-row-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      border-left: 4px solid #D4AF37;
      padding-left: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .portfolio-row-track {
      overflow-y: visible;
      padding-top: 10px;
      position: relative;
      z-index: 2;
    }
    .portfolio-row-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .portfolio-nav {
      height: 40px;
      padding: 0 16px;
      border-radius: 999px;
      border: 1px solid #2b2b2b;
      color: #e6e6e6;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      transition: all 0.3s ease;
      background: transparent;
    }
    .portfolio-nav:hover {
      border-color: #D4AF37;
      color: #D4AF37;
      transform: translateY(-1px);
    }
    .portfolio-row-link {
      color: #D4AF37;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      transition: color 0.3s ease;
    }
    .portfolio-row-link:hover {
      color: #ffffff;
    }
    @media (max-width: 768px) {
      .portfolio-row-head {
        align-items: flex-start;
        flex-direction: column;
      }
      .portfolio-row-actions {
        width: 100%;
      }
    }
    .portfolio-folder::before {
      content: '';
      position: absolute;
      top: -20px;
      left: 36px;
      width: 170px;
      height: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom: none;
      border-radius: 16px 16px 0 0;
      background: #121212;
      z-index: 1;
    }
    .photo-preview,
    .video-preview {
      position: absolute;
      inset: 0;
      overflow: hidden;
      z-index: 1;
    }
    .photo-slide {
      position: absolute;
      top: 0;
      left: 0;
      width: 130%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      filter: saturate(1.1);
      animation: photo-slide 12s linear infinite;
    }
    .photo-slide--b { animation-delay: 4s; }
    .photo-slide--c { animation-delay: 8s; }
    @keyframes photo-slide {
      0% { opacity: 0; transform: translateX(25%); }
      12% { opacity: 1; }
      55% { opacity: 1; transform: translateX(-45%); }
      85% { opacity: 0; transform: translateX(-115%); }
      100% { opacity: 0; transform: translateX(-115%); }
    }
    .video-preview-media {
      width: 115%;
      height: 100%;
      object-fit: cover;
      animation: video-pan 14s ease-in-out infinite;
      filter: contrast(1.05);
    }
    @keyframes video-pan {
      0% { transform: scale(1.05) translateX(0%); }
      50% { transform: scale(1.12) translateX(-6%); }
      100% { transform: scale(1.05) translateX(0%); }
    }
    @media (max-width: 768px) {
      .gallery-bar {
        flex-direction: column;
        gap: 10px;
        border-radius: 24px;
      }
      .gallery-label {
        width: auto;
      }
      .gallery-button {
        width: 100%;
      }
      .gallery-bar:hover .gallery-button {
        width: 100%;
      }
      .portfolio-panel {
        min-height: 320px;
      }
    }

    /* 6. 3D Cube */
    .cube-scene { width: 10px; height: 10px; perspective: 2400px; margin: 0 auto; }
    .cube { width: 100%; height: 100%; position: static; transform-style: preserve-3d; animation: rotateCube 15s infinite linear; }
    .cube-face {
      position: absolute; width: 50px; height: 50px;
      border: 4px solid #D4AF37; /* gold Borders */
      background: rgba(253, 190, 51, 0.05);
      box-shadow: 0 0 20px rgba(253, 190, 51, 0.1) inset, 0 0 10px rgba(253, 190, 51, 0.3);
      display: flex; align-items: right;
    }
    .cube-face--front  { transform: rotateY(  0deg) translateZ(75px); }
    .cube-face--back   { transform: rotateY(180deg) translateZ(75px); }
    .cube-face--right  { transform: rotateY( 90deg) translateZ(75px); }
    .cube-face--left   { transform: rotateY(-90deg) translateZ(75px); }
    .cube-face--top    { transform: rotateX( 90deg) translateZ(75px); }
    .cube-face--bottom { transform: rotateX(-90deg) translateZ(75px); }
    @keyframes rotateCube { 0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); } 100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); } }

    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

    /* 7. Underline Animations (For "Read More" & Links) */
    .link-underline { position: relative; display: inline-block; }
    .link-underline::after {
        content: ''; position: absolute; width: 0; height: 2px; bottom: -4px; left: 0;
        background-color: #D4AF37; /* gold Underline */
        transition: width 0.3s ease-out;
    }
    .group:hover .link-underline::after, .link-underline:hover::after { width: 100%; }

    /* --- 8. THE SCRIBBLE ANIMATION (For "327%") --- */
   .scroll-underline { 
        position: relative; 
        display: inline-block; 
        transition: transform 0.3s ease; 
    }
    
    .scroll-underline::after {
        content: ''; 
        position: absolute; 
        width: 0; 
        height: 15px; /* Height to fit the double arches */
        bottom: -12px; 
        left: 0;
        
        /* DOUBLE ARCH SVG (gold Stroke %23FDBE33) */
        background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 25' preserveAspectRatio='none'%3E%3Cpath d='M0 10 Q 50 20 100 10' stroke='%23FDBE33' stroke-width='3' fill='none' stroke-linecap='round' /%3E%3Cpath d='M5 18 Q 50 28 95 18' stroke='%23FDBE33' stroke-width='3' fill='none' stroke-linecap='round' /%3E%3C/svg%3E");
        
        background-repeat: no-repeat; 
        background-size: 100% 100%; 
        background-position: center;
        
        opacity: 0; 
        transition: width 1.5s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.5s ease; 
        z-index: 1; 
    }
    
    .scroll-underline.in-view::after { width: 100%; opacity: 1; }
  `}</style>
);

// Replace the existing cafeVintcent const with this:
const cafeVintcent = {
  lat: -34.18295,
  lng: 22.14662,
}; // The Vintcent, Cafe Vintcent, Shop 16, Prince Vintcent Building, Mossel Bay, 6500


// --- NEW: Firebase Sign-In block ---
const SignIn = ({ onSignedIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onSignedIn(result.user);
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card border border-custom-gold/30 rounded-2xl p-8 text-center space-y-4">
      <h3 className="text-2xl font-bold text-white">Sign in to unlock</h3>
      <p className="text-gray-300 text-sm">
        Verify yourself to claim your reward.
      </p>
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full bg-custom-gold text-black font-bold py-3 rounded-lg hover:bg-white transition duration-300 disabled:opacity-60"
      >
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
};

const parseName = (displayName = '') => {
  const parts = displayName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

// --- Sign-in block with Google + manual fallback ---
const SignInBlock = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleGoogle = async () => {
    if (!acceptedTerms) {
      setErr('Please accept the terms to continue.');
      return;
    }
    setIsLoading(true);
    setErr('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const { firstName, lastName } = parseName(result.user.displayName || '');
      onComplete({
        firstName,
        lastName,
        email: result.user.email || '',
        uid: result.user.uid,
        provider: 'google',
      });
    } catch (e) {
      setErr(e.message || 'Sign-in failed. Try again or use manual entry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManual = (e) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setErr('Please accept the terms to continue.');
      return;
    }
    if (!manual.firstName || !manual.lastName || !manual.email || !manual.password) {
      setErr('Please fill in first name, surname, email, and password.');
      return;
    }
    const run = async () => {
      setIsLoading(true);
      setErr('');
      try {
        let credential;
        try {
          credential = await signInWithEmailAndPassword(auth, manual.email, manual.password);
        } catch (signInError) {
          if (signInError?.code === 'auth/user-not-found') {
            credential = await createUserWithEmailAndPassword(auth, manual.email, manual.password);
          } else {
            throw signInError;
          }
        }
        const u = credential.user;
        onComplete({
          firstName: manual.firstName,
          lastName: manual.lastName,
          email: u.email || manual.email,
          uid: u.uid,
          provider: 'password',
        });
      } catch (e) {
        const msg = e?.message || 'Could not sign in. Please try again.';
        setErr(msg);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  };

  return (
    <div className="glass-card border border-custom-gold/30 rounded-2xl p-6 space-y-4">
      <h3 className="text-xl font-bold text-white">Sign in to unlock</h3>
      <button
        onClick={handleGoogle}
        disabled={isLoading || !acceptedTerms}
        className="w-full bg-custom-gold text-black font-bold py-3 rounded-lg hover:bg-white transition duration-300 disabled:opacity-60"
      >
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </button>
      <div className="text-gray-400 text-sm text-center">or add your details</div>
      <form onSubmit={handleManual} className="space-y-3">
        <input
          value={manual.firstName}
          onChange={(e) => setManual({ ...manual, firstName: e.target.value })}
          placeholder="First name"
          className="w-full bg-gray-800 text-white px-3 py-2 rounded"
        />
        <input
          value={manual.lastName}
          onChange={(e) => setManual({ ...manual, lastName: e.target.value })}
          placeholder="Surname"
          className="w-full bg-gray-800 text-white px-3 py-2 rounded"
        />
        <input
          type="email"
          value={manual.email}
          onChange={(e) => setManual({ ...manual, email: e.target.value })}
          placeholder="Email"
          className="w-full bg-gray-800 text-white px-3 py-2 rounded"
        />
        <input
          type="password"
          value={manual.password}
          onChange={(e) => setManual({ ...manual, password: e.target.value })}
          placeholder="Password (min 6 characters)"
          className="w-full bg-gray-800 text-white px-3 py-2 rounded"
        />
        <label className="flex items-start gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            className="mt-1 accent-custom-gold"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
          />
          <span>
            I agree to the Terms & Conditions and Privacy Policy and consent to receive SHOCKWAVE updates, service announcements, and offers via email. You can opt out anytime.
          </span>
        </label>
        <button
          type="submit"
          disabled={!acceptedTerms}
          className="w-full border border-custom-gold text-custom-gold font-bold py-2 rounded hover:bg-custom-gold hover:text-black transition duration-300"
        >
          Continue
        </button>
      </form>
      {err && <p className="text-red-400 text-sm">{err}</p>}
    </div>
  );
};

// --- Routing control with safe cleanup ---
const RoutingMachine = ({ userPos, destPos }) => {
  const map = useMap();
  const controlRef = useRef(null);

  useEffect(() => {
    if (!map || !userPos || !destPos) return;

    // remove any existing control
    if (controlRef.current) {
      try {
        controlRef.current.off();
        if (controlRef.current._map) controlRef.current._map.removeControl(controlRef.current);
      } catch (_) {}
      controlRef.current = null;
    }

    const control = L.Routing.control({
      waypoints: [L.latLng(userPos.lat, userPos.lng), L.latLng(destPos.lat, destPos.lng)],
      lineOptions: { styles: [{ color: '#D4AF37', weight: 6 }] },
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      collapsible: true,
    }).addTo(map);

    controlRef.current = control;

    return () => {
      if (controlRef.current) {
        try {
          controlRef.current.off();
          if (controlRef.current._map) controlRef.current._map.removeControl(controlRef.current);
        } catch (_) {}
        controlRef.current = null;
      }
    };
  }, [map, userPos, destPos]);

  return null;
};

// --- Map with live location + route ---
const RewardMap = () => {
  const [userPos, setUserPos] = useState(null);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGeoError(err.message || 'Unable to fetch your location.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  return (
    <div className="glass-card border border-custom-gold/20 rounded-2xl overflow-hidden">
      <div className="h-[420px] w-full">
        <MapContainer center={cafeVintcent} zoom={14} className="h-full w-full" scrollWheelZoom>
          <TileLayer 
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
/>
          <Marker position={cafeVintcent}>
            <Popup>
              The Vintcent, Cafe Vintcent, Shop 16<br />
              Prince Vintcent Building, Mossel Bay, 6500
            </Popup>
          </Marker>
          {userPos && (
            <>
              <Marker position={userPos}>
                <Popup>Your current location</Popup>
              </Marker>
              <RoutingMachine userPos={userPos} destPos={cafeVintcent} />
            </>
          )}
        </MapContainer>
      </div>
      {geoError && <p className="text-red-400 text-sm p-4">{geoError}</p>}
    </div>
  );
};

// --- Reward Claim page (gated by ?access=true and auth) ---
const RewardClaim = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasAccess = searchParams.get('access') === 'true';

  const [userData, setUserData] = useState(null); // {firstName,lastName,email,uid,provider}
  const [claimed, setClaimed] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [authReady, setAuthReady] = useState(false);

  // Keep in sync with Firebase auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        const { firstName, lastName } = parseName(u.displayName || '');
        setUserData({
          firstName,
          lastName,
          email: u.email || '',
          uid: u.uid,
          provider: 'google',
        });
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Store claim once we have user data
  useEffect(() => {
    const storeClaim = async () => {
      if (!userData || claimed) return;
      try {
        if (db) {
          await addDoc(collection(db, 'rewardClaims'), {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            uid: userData.uid,
            provider: userData.provider,
            createdAt: serverTimestamp(),
          });
        } else {
          // local fallback
          const existing = JSON.parse(localStorage.getItem('rewardClaims') || '[]');
          existing.push({ ...userData, createdAt: new Date().toISOString() });
          localStorage.setItem('rewardClaims', JSON.stringify(existing));
        }
        setClaimed(true);
      } catch (e) {
        setStoreError(e.message || 'Unable to store claim. Please try again.');
      }
    };
    storeClaim();
  }, [userData, claimed]);

  if (!hasAccess) return null; // fully hidden without the param

  return (
    <div className="bg-custom-dark min-h-screen flex flex-col">
      <GlobalStyles />
      <main className="flex-grow pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-5xl space-y-10">
          <div className="glass-card border border-custom-gold/40 rounded-3xl p-10 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-custom-gold text-sm uppercase tracking-[0.3em] mb-3">
                  VIP REWARD
                </p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                  Claim your free photoshoot at <span className="text-custom-gold">The Vintcent</span>
                </h1>
                <p className="text-gray-300 mt-4">
                  Sign in to unlock your reward and get guided back to Cafe Vintcent.
                </p>
              </div>
              <div className="w-full md:w-72">
                {!userData ? (
                  <SignInBlock onComplete={setUserData} />
                ) : (
                  <div className="glass-card border border-green-400/40 rounded-2xl p-6 text-center">
                    <p className="text-green-400 font-bold text-lg mb-2">Signed in</p>
                    <p className="text-white font-semibold">
                      {userData.firstName} {userData.lastName}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">{userData.email}</p>
                    <p className="text-gray-500 text-xs mt-2">UID: {userData.uid}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {userData && (
            <>
              <div className="glass-card border border-custom-gold/25 rounded-3xl p-10 space-y-4">
                <h2 className="text-3xl font-bold text-white">
                  YouÃ¢â‚¬â„¢ve successfully claimed your free photoshoot at The Vintcent!
                </h2>
                <p className="text-gray-300">
                  Show this confirmation to our crew on site. Your claim has been recorded.
                </p>
                {storeError && <p className="text-red-400 text-sm">{storeError}</p>}
              </div>

              <div className="glass-card border border-custom-gold/25 rounded-3xl p-10 space-y-6">
                <div className="flex items-center gap-3">
                  <svg className="w-10 h-10 text-custom-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-custom-gold">Guided route</p>
                    <h3 className="text-2xl font-bold text-white">Get back to Cafe Vintcent</h3>
                    <p className="text-gray-300 text-sm">
                      Live GPS, clear directions, and a highlighted path to keep you on track.
                    </p>
                  </div>
                </div>
                <RewardMap />
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => navigate('/')}
                    className="bg-custom-gold text-black font-bold px-6 py-3 rounded-lg hover:bg-white transition duration-300"
                  >
                    Explore More
                  </button>
                  <span className="text-gray-400 text-sm">
                    Stay and explore our latest work, services, and shop while youÃ¢â‚¬â„¢re here.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

// QR Stamp Rewards - BEGIN
// Handles QR scan landing, validates codes, and renders progress toward the free photoshoot.
const RewardsHomeLink = () => (
  <div className="flex justify-end">
    <Link
      to="/"
      className="inline-flex items-center gap-2 text-custom-gold font-semibold hover:text-white transition"
    >
      <span aria-hidden="true">Ã¢â€ Â</span>
      <span>Back to home</span>
    </Link>
  </div>
);

const StampRewardsPage = () => {
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code');
  const { user } = useAuth();
  const [sessionUser, setSessionUser] = useState(null);
  const [stampState, setStampState] = useState(() => getStoredStampState());
  const [lastStamp, setLastStamp] = useState(null);
  const [status, setStatus] = useState('idle');
  const [hydrated, setHydrated] = useState(false);
  const PENDING_CODE_KEY = 'pending_reward_code';
  const SESSION_USER_KEY = 'rewards_session_user';
  const fallbackUser = useMemo(
    () =>
      user?.uid
        ? { uid: user.uid, email: user.email || '', provider: 'google', ...parseName(user.displayName || '') }
        : null,
    [user]
  );
  const authIdentity = sessionUser || fallbackUser;

  useEffect(() => {
    // restore locally-saved manual/Google session for rewards
    try {
      const storedSession = localStorage.getItem(SESSION_USER_KEY);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed?.uid) setSessionUser(parsed);
      }
    } catch (_) {}

    const stored = getStoredStampState();
    setStampState(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const syncWithAccount = async () => {
      if (!authIdentity?.uid) return;
      await ensureRewardDoc(authIdentity.uid, authIdentity.email || '');
      const remote = await getRewardState(authIdentity.uid);
      if (remote) {
        setStampState(remote);
        persistStampState(remote);
      }
    };
    syncWithAccount();
  }, [authIdentity?.uid, authIdentity?.email]);

  const setAndPersistSession = (payload) => {
    setSessionUser(payload);
    try {
      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(payload));
    } catch (_) {}
  };

  const applyStampUpdate = (updater, reason = 'qr') => {
    setStampState((prev) => {
      const next = normalizeStampState(typeof updater === 'function' ? updater(prev) : updater);
      persistStampState(next);
      if (authIdentity?.uid) {
        setRewardState(authIdentity.uid, authIdentity.email || '', next, reason);
        logActivity({
          type: 'rewards:update',
          uid: authIdentity.uid,
          email: authIdentity.email || '',
          reason,
          collected: next.collectedStamps,
        });
      }
      return next;
    });
  };

  const processCode = useCallback(
    (normalizedCode, reason = 'qr') => {
      if (!normalizedCode) {
        setStatus('idle');
        return 'idle';
      }
      const NEXT_STAMP_CODE = 'NEXTSTAMP';

      if (normalizedCode === NEXT_STAMP_CODE) {
        setStatus('valid');
        applyStampUpdate((prev) => {
          const updated = addNextMissingStamp(prev);
          const newlyAdded = updated.collectedStamps.find((c) => !(prev.collectedStamps || []).includes(c));
          setLastStamp(newlyAdded || null);
          return updated;
        }, reason || 'next_stamp');
        return 'valid';
      }

      const isValid = VALID_STAMP_CODES.some((c) => c.id === normalizedCode);
      if (!isValid) {
        setStatus('invalid');
        setLastStamp(null);
        return 'invalid';
      }

      setStatus('valid');
      applyStampUpdate((prev) => {
        const updated = addStampToState(prev, normalizedCode);
        setLastStamp(normalizedCode);
        return updated;
      }, reason);
      return 'valid';
    },
    [applyStampUpdate]
  );

  // Persist incoming QR code so we can re-apply after login.
  useEffect(() => {
    if (!codeParam) return;
    const normalizedCode = codeParam.toUpperCase();
    try {
      localStorage.setItem(PENDING_CODE_KEY, normalizedCode);
    } catch (_) {}
  }, [codeParam]);

  useEffect(() => {
    if (!hydrated) return;
    if (!codeParam) {
      setStatus('idle');
      return;
    }
    const normalizedCode = codeParam.toUpperCase();
    processCode(normalizedCode, 'qr');
  }, [codeParam, hydrated, processCode]);

  // After sign-in (or hydration), apply any stored code so users donÃ¢â‚¬â„¢t need to re-scan.
  useEffect(() => {
    if (!hydrated) return;
    let stored = null;
    try {
      stored = localStorage.getItem(PENDING_CODE_KEY);
    } catch (_) {}
    if (!stored) return;
    processCode(stored, 'stored_qr');
    try {
      localStorage.removeItem(PENDING_CODE_KEY);
    } catch (_) {}
  }, [authIdentity?.uid, hydrated, processCode]);

  const collectedCount = stampState.collectedStamps.length;
  const isUnlocked = stampState.photoshootUnlocked || collectedCount >= REQUIRED_STAMP_COUNT;
  const lastStampLabel = lastStamp ? (VALID_STAMP_CODES.find((c) => c.id === lastStamp)?.displayName || lastStamp) : '';

  const handleClaimReward = () => {
    const updated = normalizeStampState({ ...stampState, photoshootClaimed: true, photoshootUnlocked: isUnlocked });
    setStampState(updated);
    persistStampState(updated);
  };

  useEffect(() => {
    if (!authIdentity?.uid) return;
    applyStampUpdate((prev) => addStampToState(prev, 'TIER1'), 'signin_tier1');
    ensureRewardDoc(authIdentity.uid, authIdentity.email || '');
  }, [authIdentity?.uid, authIdentity?.email]);

  if (!authIdentity?.uid) {
    return (
      <div className="bg-custom-dark min-h-screen flex flex-col">
        <GlobalStyles />
        <main className="flex-grow pt-28 pb-16 px-4">
          <div className="container mx-auto max-w-4xl space-y-8">
            <RewardsHomeLink />
            <div className="glass-card border border-custom-gold/40 rounded-3xl p-10 md:p-12 space-y-4">
              <p className="text-custom-gold text-sm uppercase tracking-[0.3em] mb-3">QR Stamp Rewards</p>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Sign in to unlock rewards
              </h1>
              <p className="text-gray-300">
                Create or sign into your account to access the rewards tracker. Tier 1 is added automatically after you agree to
                terms and sign in. You also consent to receive SHOCKWAVE updates and offers by email (opt out anytime).
              </p>
            </div>
            <SignInBlock onComplete={setAndPersistSession} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-custom-dark min-h-screen flex flex-col">
      <GlobalStyles />
      <main className="flex-grow pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          <RewardsHomeLink />
          <div className="glass-card border border-custom-gold/40 rounded-3xl p-10 md:p-12">
            <p className="text-custom-gold text-sm uppercase tracking-[0.3em] mb-3">QR Stamp Rewards</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
              SHOCKWAVE QR Stamp Rewards
            </h1>
            <p className="text-gray-300 max-w-3xl">
              Scan all six unique codes around town to unlock a free photoshoot. Each valid scan fills one stamp slot below.
            </p>
            {status === 'invalid' && (
              <div className="mt-4 text-red-400 font-semibold">Invalid or expired QR code.</div>
            )}
            {status === 'valid' && lastStamp && (
              <div className="mt-4 text-green-400 font-semibold">
                Unlocked {lastStampLabel}! ({collectedCount} of {REQUIRED_STAMP_COUNT} stamps collected)
              </div>
            )}
          </div>

          <div className="glass-card border border-custom-gold/25 rounded-3xl p-8 space-y-6">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-custom-gold">Progress</p>
                <h3 className="text-2xl font-bold text-white">
                  You&apos;ve collected {collectedCount} of {REQUIRED_STAMP_COUNT} stamps
                </h3>
              </div>
              <div className="text-gray-400 text-sm">
                Re-scan the same QR to check status. Duplicates won&apos;t add extra stamps.
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {VALID_STAMP_CODES.map((code) => {
                const isFilled = stampState.collectedStamps.includes(code.id);
                return (
                  <div
                    key={code.id}
                    className={`rounded-xl p-4 border text-center transition ${
                      isFilled
                        ? 'border-custom-gold bg-custom-gold/10 text-white'
                        : 'border-gray-800 bg-black/30 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-extrabold ${
                          isFilled ? 'bg-custom-gold text-black' : 'bg-gray-800 text-white'
                        }`}
                      >
                        {VALID_STAMP_CODES.indexOf(code) + 1}
                      </div>
                    </div>
                    <p className="font-bold">{code.displayName}</p>
                    <p className="text-xs text-gray-400 mt-1">{isFilled ? 'Collected' : 'Pending'}</p>
                  </div>
                );
              })}
            </div>

            {isUnlocked ? (
              <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 space-y-3">
                <p className="text-green-400 text-sm uppercase tracking-[0.25em]">Unlocked</p>
                <h3 className="text-3xl font-bold text-white">You&apos;ve unlocked your free photoshoot!</h3>
                <p className="text-gray-200">
                  Tap below for booking instructions and show this screen when you arrive.
                </p>
                <button
                  onClick={handleClaimReward}
                  className="bg-custom-gold text-black font-bold px-6 py-3 rounded-lg hover:bg-white transition duration-300"
                >
                  Claim / View Instructions
                </button>
                {stampState.photoshootClaimed && (
                  <p className="text-green-300 text-sm">Marked as claimed on this device.</p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 bg-black/40 p-6">
                <p className="text-gray-300">
                  Keep scanning QR codes or earn stamps through purchases to reach all six and unlock the shoot.
                </p>
              </div>
            )}
          </div>

          <div className="glass-card border border-custom-gold/25 rounded-3xl p-8 space-y-4">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-custom-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-custom-gold">Guided route</p>
                <h3 className="text-2xl font-bold text-white">Get back to Cafe Vintcent</h3>
                <p className="text-gray-300 text-sm">
                  Same address and directions as the QR page. Use the map to navigate straight to the venue.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                className="bg-custom-gold text-black font-bold px-5 py-3 rounded-lg hover:bg-white transition duration-300"
                href="https://www.google.com/maps/dir/?api=1&destination=Cafe+Vintcent%2C+Mossel+Bay"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </a>
              <span className="text-gray-400 text-sm">
                Shop 16, Prince Vintcent Building, Mossel Bay, 6500
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
// QR Stamp Rewards - END

const RewardCodeRedirect = () => {
  const { codeId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!codeId) return;
    const normalized = codeId.toUpperCase();
    navigate(`/rewards?code=${encodeURIComponent(normalized)}`, { replace: true });
  }, [codeId, navigate]);

  return null;
};

// --- Off-Canvas Menu Component ---
// This is the new slide-out menu
// --- Off-Canvas Menu Component (Updated for Admin/User roles) ---
const OffCanvasMenu = ({ isOpen, onClose, logoSrc }) => {
  const { role } = useAuth(); // Get the current user role
  const navigate = useNavigate(); // For internal navigation

  const handleAdminNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Menu Panel */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-full md:w-96 lg:w-[450px] bg-custom-card p-8 md:p-12 shadow-lg z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'transform translate-x-0' : 'transform translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          
          {/* Top Section: Logo and Close Button */}
          <div className="flex justify-between items-center mb-12">
            <a href="#">
              <img src={logoSrc} alt="SHOCKWAVE Logo" className="h-12 w-auto" />
            </a>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close menu">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* --- CONDITIONAL CONTENT START --- */}
          {role === 'admin' ? (
             /* ================= ADMIN EDITOR VIEW ================= */
            <div className="flex-grow overflow-y-auto animate-fade-in">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <h3 className="text-2xl font-bold text-white">Admin Editor</h3>
              </div>

              <p className="text-gray-400 mb-8 text-sm">
                Quick access to manage your site content. Select a module to edit.
              </p>
              
              <div className="space-y-4">
                {/* Dashboard */}
                <button onClick={() => handleAdminNav('/admin')} className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 hover:border-l-4 hover:border-custom-gold transition-all group">
                   <span className="font-bold text-white group-hover:text-custom-gold">Dashboard Overview</span>
                   <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>

                {/* Shop Manager */}
                <button onClick={() => handleAdminNav('/admin/shop')} className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 hover:border-l-4 hover:border-custom-gold transition-all group">
                   <div className="text-left">
                     <span className="block font-bold text-white group-hover:text-custom-gold">Shop Products</span>
                     <span className="text-xs text-gray-500">Edit prices, images & descriptions</span>
                   </div>
                   <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                </button>

                {/* Blog Manager */}
                <button onClick={() => handleAdminNav('/admin/blog')} className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 hover:border-l-4 hover:border-custom-gold transition-all group">
                   <div className="text-left">
                     <span className="block font-bold text-white group-hover:text-custom-gold">Blog Posts</span>
                     <span className="text-xs text-gray-500">Write articles & updates</span>
                   </div>
                   <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>

                {/* Portfolio Manager */}
                <button onClick={() => handleAdminNav('/admin/portfolio')} className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 hover:border-l-4 hover:border-custom-gold transition-all group">
                   <div className="text-left">
                     <span className="block font-bold text-white group-hover:text-custom-gold">Portfolio</span>
                     <span className="text-xs text-gray-500">Upload new project galleries</span>
                   </div>
                   <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </button>
              </div>

              <div className="mt-12 border-t border-gray-700 pt-6">
                 <button onClick={() => { auth.signOut(); onClose(); window.location.href = '/'; }} className="text-red-400 hover:text-red-300 font-bold text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Sign Out Admin
                 </button>
              </div>
            </div>
          ) : (
            /* ================= STANDARD USER VIEW ================= */
            <div className="flex-grow overflow-y-auto animate-fade-in">
              <h3 className="text-2xl font-bold text-white">Do you have a project in mind?</h3>
              
              <div className="my-8">
                <h4 className="text-xl font-bold text-white mb-6">Contact Us</h4>
                <ul className="space-y-4 text-gray-400">
                  <li className="flex items-start">
                    <span className="mt-1 mr-3 text-custom-gold">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </span>
                    <span>Mosselbay</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mt-1 mr-3 text-custom-gold">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                    </span>
                    <span>+27 62 107 2795</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mt-1 mr-3 text-custom-gold">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </span>
                    <span>info@shockwave.online</span>
                  </li>
                </ul>
              </div>

              <div className="my-8">
                <h4 className="text-xl font-bold text-white mb-6">Subscribe</h4>
                <p className="text-gray-400 mb-4">
                  Join the tribe. Stay ahead. Create better.
                </p>
                <form className="flex">
                  <input type="email" placeholder="example@gmail.com" className="w-full px-4 py-3 rounded-l-md bg-gray-700 text-white border-0 focus:ring-2 focus:ring-custom-gold outline-none" required />
                  <button type="submit" className="bg-custom-gold text-black font-bold px-4 py-3 rounded-r-md hover:bg-[#e5c76b] transition duration-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </button>
                </form>
              </div>
            </div>
          )}
          {/* --- CONDITIONAL CONTENT END --- */}
          
          {/* Bottom Section: Social Links (Always visible or customizable) */}
          <div className="mt-auto pt-8 border-t border-gray-700">
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/profile.php?id=61574788783029" className="text-gray-400 hover:text-custom-gold" aria-label="Facebook">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-custom-gold" aria-label="Twitter">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.63 11.63 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-custom-gold" aria-label="LinkedIn">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" /></svg>
              </a>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

// --- Header Component ---
// We pass 'navigate' and 'currentPage' as props from the App component
const Header = ({ navigate, currentPage, cartCount }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOffCanvasMenuOpen, setIsOffCanvasMenuOpen] = useState(false);
  const { role, user } = useAuth();
  const routerNavigate = useNavigate();
  const accountLabel = user ? 'ACCOUNT' : 'LOGIN';

  const handleNavClick = (e, page) => {
    e.preventDefault();
    if (page === 'account' && !user) {
      routerNavigate('/login');
    } else {
      navigate(page);
    }
    setIsMobileMenuOpen(false);
  };

  const getNavLinkClass = (page) => `nav-link ${currentPage === page ? 'active' : ''}`;
  const getMobileNavLinkClass = (page) => `block text-white py-2 ${currentPage === page ? 'text-custom-gold' : ''}`;

  return (
    <header className="absolute top-0 left-0 w-full z-100">
      <nav className="container mx-auto px-4 md:px-6 py-6 flex justify-between items-center">
        <div className="flex items-center">
          <a href="#" className="mr-12" onClick={(e) => handleNavClick(e, 'home')}>
            <img src={logo} alt="SHOCKWAVE Logo" className="h-16 w-auto" />
          </a>
          {/* Desktop Nav - The "Buttons" on the header */}
          <div className="hidden md:flex items-center space-x-10">
            <a href="#" className={getNavLinkClass('home')} onClick={(e) => handleNavClick(e, 'home')}>HOME</a>
            <a href="#" className={getNavLinkClass('about')} onClick={(e) => handleNavClick(e, 'about')}>ABOUT</a>
            <a href="#" className={getNavLinkClass('services')} onClick={(e) => handleNavClick(e, 'services')}>SERVICES</a>
            <a href="#" className={getNavLinkClass('portfolio')} onClick={(e) => handleNavClick(e, 'portfolio')}>PORTFOLIO</a>
            <a href="#" className={getNavLinkClass('blog')} onClick={(e) => handleNavClick(e, 'blog')}>BLOG</a>
            <a href="#" className={getNavLinkClass('shop')} onClick={(e) => handleNavClick(e, 'shop')}>SHOP</a>
            {role === 'admin' && <Link to="/admin" className="nav-link">ADMIN</Link>}
          </div>
        </div>
        <div className="md:hidden flex items-center gap-4">
          <button
            className="relative text-white hover:text-custom-gold transition duration-300"
            onClick={() => navigate('cart')}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-custom-gold text-black text-xs font-extrabold rounded-full px-2 py-0.5">
                {cartCount}
              </span>
            )}
          </button>
          <a
            href="#"
            className="text-white hover:text-custom-gold text-sm"
            onClick={(e) => handleNavClick(e, 'account')}
          >
            {accountLabel}
          </a>
          <button className="text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
            <button className="relative text-white hover:text-custom-gold transition duration-300" onClick={() => navigate('cart')}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-custom-gold text-black text-xs font-extrabold rounded-full px-2 py-0.5">
                {cartCount}
              </span>
            )}
        </button>
        <a href="#" className={getNavLinkClass('account')} onClick={(e) => handleNavClick(e, 'account')}>{accountLabel}</a>
        <button className="text-white hover:text-custom-gold transition duration-300" onClick={() => setIsOffCanvasMenuOpen(true)}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
    </div>
        
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 p-6 bg-custom-dark shadow-xl border-t border-gray-800">
            <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-1">
              <div className="space-y-2">
                <p className="text-xs tracking-[0.18em] text-gray-400 uppercase">Pages</p>
              <div className="space-y-1">
                <a href="#" className={getMobileNavLinkClass('home')} onClick={(e) => handleNavClick(e, 'home')}>HOME</a>
                <a href="#" className={getMobileNavLinkClass('about')} onClick={(e) => handleNavClick(e, 'about')}>ABOUT</a>
                <a href="#" className={getMobileNavLinkClass('services')} onClick={(e) => handleNavClick(e, 'services')}>SERVICES</a>
                <a href="#" className={getMobileNavLinkClass('portfolio')} onClick={(e) => handleNavClick(e, 'portfolio')}>PORTFOLIO</a>
                  <a href="#" className={getMobileNavLinkClass('blog')} onClick={(e) => handleNavClick(e, 'blog')}>BLOG</a>
                  <a href="#" className={getMobileNavLinkClass('shop')} onClick={(e) => handleNavClick(e, 'shop')}>SHOP</a>
                </div>
              </div>
              <div className="border-t border-gray-800 pt-4 space-y-2">
                <p className="text-xs tracking-[0.18em] text-gray-400 uppercase">Account</p>
              <div className="space-y-1">
                <a href="#" className={getMobileNavLinkClass('cart')} onClick={(e) => handleNavClick(e, 'cart')}>CART ({cartCount})</a>
                {role === 'admin' && <Link to="/admin" className="block text-white py-2 hover:text-custom-gold transition duration-300">ADMIN</Link>}
              </div>
            </div>
            </div>
          </div>
        )}
      </nav>
      <OffCanvasMenu isOpen={isOffCanvasMenuOpen} onClose={() => setIsOffCanvasMenuOpen(false)} logoSrc={logo} />
    </header>
  );
};

// --- Footer Component ---
const Footer = () => {
  const [email, setEmail] = useState('');
const [status, setStatus] = useState('');

const handleSubscribe = async (e) => {
  e.preventDefault();
  setStatus('Subscribing...');
  const result = await addSubscriber(email);
  if (result.success) {
    setStatus('Welcome to the tribe!');
    setEmail('');
  } else {
    setStatus('Something went wrong.');
  }
};
  return (
    <footer className="bg-custom-card pt-16 md:pt-20 pb-8 border-t border-gray-800">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 items-center text-center md:text-left">
          <div className="space-y-4 md:justify-self-start text-center md:text-center">
            <a href="#" className="flex justify-center text-3xl font-extrabold">
              <img src={logo} alt="SHOCKWAVE" className="h-24 w-auto" />
            </a>
            <p className="text-gray-400 max-w-sm leading-relaxed mx-auto">
              We see every shift as a chance to adapt, improve, and guide progress. Agility isn&apos;t just a process - it&apos;s who we are.
            </p>
          </div>

          <div className="space-y-4 md:justify-self-center">
            <h4 className="text-2xl font-bold text-white">Contact Us</h4>
            <ul className="space-y-3 text-gray-400">
              <li>Mosselbay</li>
              <li>
                <a href="tel:+27621072795" className="hover:text-custom-gold transition">+27 62 107 2795</a>
              </li>
              <li>
                <a href="mailto:info@shockwave.online" className="hover:text-custom-gold transition">info@shockwave.online</a>
              </li>
            </ul>
          </div>

          <div className="space-y-4 md:justify-self-end">
            <h4 className="text-2xl font-bold text-white">Subscribe</h4>
            <form className="flex w-full max-w-sm mx-auto md:ml-auto" onSubmit={handleSubscribe}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-4 py-3 rounded-l-md bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-custom-gold focus:ring-1 focus:ring-custom-gold placeholder-gray-500 transition-all"
                required
              />
              <button
                type="submit"
                className="bg-custom-gold text-black font-bold px-6 py-3 rounded-r-md hover:bg-white hover:scale-105 transition duration-300"
              >
                Go
              </button>
            </form>
            {status && <p className="text-custom-gold mt-2 text-sm">{status}</p>}
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8 text-center text-gray-500">
          <p>&copy; 2025 SHOCKWAVE. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// --- Reusable Call to Action Component ---
const StarIcon = () => (
  // Updated SVG for a better star appearance
  <svg className="w-5 h-5 text-custom-gold fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 18.896l-7.416 3.987 1.48-8.279L.332 9.306l8.332-1.151L12 .587z"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);
const CallToAction = () => (
  <section className="py-16 md:py-24 cta-video-container bg-custom-gray">
    <img 
            className="hero-smoke-video" 
            src={heroGif} 
            alt="Hero Background" 
          />
    <div className="absolute inset-0 bg-black/70 z-10"></div>
    <div className="container mx-auto px-4 md:px-6 text-center cta-content">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white">
            "Legacy brands aren't born. They're built.
            <br />
            <span className="text-custom-gold">Let's build yours"</span>
        </h2>
        <a href="mailto:shockwave.office@gmail.com?subject=Set up a meeting" className="mt-8 inline-block bg-custom-gold text-black font-bold py-3 px-8 rounded-md text-lg hover:bg-[#e5c76b] transition duration-300">
            Scale My Business
        </a>
    </div>
  </section>
);

const Real3DCube = () => {
  return (
    <div className="cube-scene align-items-right bg-custom-gray">
      <div className="cube">
        <div className="cube-face cube-face--front"></div>
        <div className="cube-face cube-face--back"></div>
        <div className="cube-face cube-face--right"></div>
        <div className="cube-face cube-face--left"></div>
        <div className="cube-face cube-face--top"></div>
        <div className="cube-face cube-face--bottom"></div>
      </div>
    </div>
  );
};
// --- SHOP SECTION & COMPONENTS ---

// Shop Data - Add your actual products here
const shopProducts = [
  {
    id: 1,
    name: "Viral Starter Pack",
    category: "Social Media",
    price: "R1,500",
    image: iconSocial, // Placeholder: Replace with product image
    description: "5 High-impact templates + 1 Strategy session to get your socials moving."
  },
  {
    id: 2,
    name: "E-Commerce Audit",
    category: "Web Dev",
    price: "R3,500",
    image: iconWeb,
    description: "Full breakdown of your store's UX/UI flaws and conversion blockers."
  },
  {
    id: 3,
    name: "Cyber Shield Basic",
    category: "Security",
    price: "R999",
    image: iconCyber,
    description: "Essential vulnerability scan and report for small business websites."
  },
  {
    id: 4,
    name: "Brand Identity Kit",
    category: "Design",
    price: "R5,000",
    image: iconPrinting,
    description: "Logo, color palette, typography, and business card design ready for print."
  },
  {
    id: 5,
    name: "Product Photo Day",
    category: "Photography",
    price: "R4,500",
    image: iconPhoto,
    description: "Half-day shoot for up to 20 products. Includes basic retouching."
  },
  {
    id: 6,
    name: "The 'GoTo' Retainer",
    category: "Full Service",
    price: "R12,000",
    image: graphicCube,
    description: "Monthly full-service marketing and maintenance. The ultimate peace of mind."
  }
];

const ProductModal = ({ product, onClose, navigate, addToCart }) => {
  if (!product) return null;

  const handleAddToCart = () => {
    addToCart(product);
    onClose();
  };

  const handleBuyNow = () => {
    addToCart(product);
    navigate('checkout'); // Go straight to checkout with cart
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-custom-card border border-custom-gold rounded-xl max-w-lg w-full p-8 shadow-2xl animate-fade-in overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-custom-gold blur-[80px] opacity-20"></div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                <img src={product.image || logo} alt={product.name} className="w-12 h-12 object-contain" />
            </div>
            <h3 className="text-2xl font-bold text-white uppercase tracking-wider">{product.name}</h3>
            <p className="text-custom-gold text-xl font-bold mt-2">{product.price}</p>
            <p className="text-gray-400 text-sm mt-1">Or pay {toPriceNumber(product.price)} GG</p>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed">{product.description || (product.features && product.features.join(', '))}</p>
            
            <div className="w-full mt-8 space-y-3">
                <button 
                  onClick={handleAddToCart}
                  className="w-full bg-gray-700 text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition duration-300"
                >
                  Add to Cart
                </button>
                <button 
                  onClick={handleBuyNow}
                  className="w-full bg-custom-gold text-black font-extrabold uppercase tracking-widest py-3 rounded-lg hover:bg-white hover:scale-105 transition duration-300 shadow-[0_0_20px_rgba(253,190,51,0.3)]"
                >
                  Buy Now
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

const toPriceNumber = (price) => {
  if (typeof price === 'number') return price;
  if (price === null || price === undefined) return 0;
  const numeric = parseInt(String(price).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

const Cart = ({ cart, removeFromCart, navigate, loyaltyBalance = 0, onRedeemWithPoints }) => {
  // Calculate Total
  const total = cart.reduce((sum, item) => {
    const priceVal = toPriceNumber(item.price);
    return sum + (priceVal * item.qty);
  }, 0);
  const canPayWithPoints = loyaltyBalance >= total && total > 0;

  return (
    <div className="min-h-screen bg-custom-dark pt-36 pb-24 px-4 md:px-6 relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-custom-gold blur-[150px] opacity-5 pointer-events-none"></div>

        <div className="container mx-auto max-w-6xl relative z-10 cart-container">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-12">
                Your <span className="text-custom-gold">Cart</span>
            </h1>
            
            {cart.length === 0 ? (
                <div className="glass-card rounded-xl p-16 text-center max-w-3xl mx-auto border border-gray-800">
                    <p className="text-2xl text-white font-bold mb-4">Your cart is currently empty.</p>
                    <button onClick={() => navigate('shop')} className="bg-custom-gold text-black font-bold uppercase tracking-widest py-3 px-8 rounded hover:bg-white transition duration-300">
                        Return to Shop
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Cart Items List */}
                    <div className="lg:col-span-2 space-y-6">
                        {cart.map((item, index) => (
                            <div key={`${item.id}-${index}`} className="glass-card p-6 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-6 border border-gray-800">
                                <div className="w-full sm:w-24 h-24 flex-shrink-0 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-grow text-center sm:text-left">
                                    <h3 className="font-bold text-xl text-white">{item.name}</h3>
                                    <p className="text-gray-400 text-sm uppercase tracking-wide mt-1">{item.category}</p>
                                    <p className="text-custom-gold font-extrabold text-lg mt-2">{item.price} <span className="text-gray-500 text-sm font-normal">x {item.qty}</span></p>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="p-3 text-gray-400 hover:text-red-500 transition duration-300">
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-8 rounded-xl border border-custom-gold/20 sticky top-32">
                            <h3 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-4">Order Summary</h3>
                            <div className="flex justify-between mb-8 text-2xl font-extrabold text-custom-gold">
                                <span>Total</span>
                                <span>R {total}</span>
                            </div>

                            <div className="mb-6 text-sm text-gray-300 space-y-1">
                              <div className="flex justify-between">
                                <span>GG Balance</span>
                                <span className="text-white font-bold">{loyaltyBalance} GG</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Needed</span>
                                <span className={canPayWithPoints ? 'text-green-400' : 'text-red-400'}>
                                  {total} GG
                                </span>
                              </div>
                              {!canPayWithPoints && total > 0 && (
                                <p className="text-xs text-red-400">You need {Math.max(0, total - loyaltyBalance)} more GG.</p>
                              )}
                            </div>
                            
                            {/* THIS BUTTON NOW NAVIGATES TO THE NEW PAGE */}
                            <button 
                                onClick={() => onRedeemWithPoints && onRedeemWithPoints(cart, total)}
                                disabled={!canPayWithPoints}
                                className="w-full mb-3 bg-gray-800 text-white font-bold uppercase tracking-widest py-3 rounded-lg border border-gray-700 hover:border-custom-gold hover:text-custom-gold transition duration-300 disabled:opacity-50"
                            >
                                Pay with GG Points ({total} GG)
                            </button>

                            <button 
                                onClick={() => navigate('checkout')} 
                                className="w-full bg-custom-gold text-black font-bold uppercase tracking-widest py-4 rounded-lg hover:bg-white transition duration-300 shadow-[0_0_20px_rgba(253,190,51,0.3)] flex justify-center items-center gap-2"
                            >
                                <span>Proceed to Checkout</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                            </button>

                            <button onClick={() => navigate('shop')} className="w-full mt-4 text-gray-500 hover:text-white text-sm font-semibold underline decoration-transparent hover:decoration-white transition-all">
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

// Instant Conversion Modal
// Instant Conversion Modal (MODIFIED TO REDIRECT TO SECURE CHECKOUT)
const ShopModal = ({ product, onClose, navigate, addToCart }) => {
  const handleAddToCart = () => {
    addToCart(product);
    onClose();
  };

  const handleBuyNow = () => {
    addToCart(product);
    onClose();
    navigate('checkout');
  };
  
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-custom-card border border-custom-gold rounded-xl max-w-lg w-full p-8 shadow-2xl animate-fade-in overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-custom-gold blur-[80px] opacity-20"></div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        
        <div className="flex flex-col items-center text-center">
            <>
              <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                <img src={product.image} alt={product.name} className="w-10 h-10 object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-white uppercase tracking-wider">{product.name}</h3>
              <p className="text-custom-gold text-xl font-bold mt-2">{product.price}</p>
              <p className="text-gray-400 mt-4 text-sm leading-relaxed">{product.description}</p>
              
              <div className="w-full mt-8 space-y-3">
                <button 
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full bg-gray-800 text-gray-300 font-bold uppercase tracking-widest py-3 rounded-lg hover:bg-gray-700 hover:text-white transition duration-300"
                    >
                      Add to Cart & Keep Browsing
                    </button>
                <button 
                      type="button"
                      onClick={handleBuyNow}
                      className="w-full bg-custom-gold text-black font-extrabold uppercase tracking-widest py-3 rounded-lg hover:bg-white transition duration-300 shadow-[0_0_20px_rgba(253,190,51,0.3)]"
                    >
                      Buy Now
                    </button>
                <p className="text-xs text-gray-500 mt-2">Checkout flows without needing any extra forms.</p>
              </div>
            </>
        </div>
      </div>
    </div>
  );
};

const VisaIcon = () => (
  <svg className="w-10 h-auto" viewBox="0 0 50 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.38 0.600098H13.5L9.83002 11.2301H9.63002L6.14002 0.600098H2.21002C1.72002 0.600098 1.25002 0.860098 1.08002 1.3001L0.12002 6.1301H0.17002C0.60002 2.6501 5.34002 3.1601 5.34002 3.1601L5.03002 1.5401L8.38002 15.2201H12.63L19.38 0.600098ZM32.7 10.3701C32.72 6.4601 27.28 6.2501 27.4 4.5101C27.43 3.9701 27.95 3.3901 29.35 3.2401C30.04 3.1601 31.91 3.1101 33.56 3.8801L34.16 1.0301C33.35 0.740098 32.29 0.440098 30.98 0.440098C27.05 0.440098 24.19 2.5001 24.15 5.5101C24.12 7.7001 26.12 8.9201 27.65 9.6801C29.22 10.4601 29.75 10.9501 29.74 11.6401C29.72 12.7001 28.46 13.1601 27.28 13.1601C25.32 13.1601 24.17 12.6201 23.28 12.2101L22.58 15.2301C23.47 15.6501 25.13 16.0001 26.85 16.0001C31.02 16.0001 33.72 13.9201 33.75 10.8701L32.7 10.3701ZM42.68 15.2201H46.47L43.99 0.600098H40.4L38.6 9.4701L36.6 0.600098H32.84L36.21 15.2201H39.99L42.68 15.2201ZM19.53 15.2201H22.9L25.01 0.600098H21.64L19.53 15.2201Z" fill="#1A1F71"/>
  </svg>
);

const MastercardIcon = () => (
  <svg className="w-10 h-auto" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="38" height="24" rx="2" fill="white"/>
    <circle cx="12" cy="12" r="12" fill="#EB001B"/>
    <circle cx="26" cy="12" r="12" fill="#F79E1B"/>
    <path d="M19 19.8643C21.6117 18.1465 23.3333 15.2536 23.3333 12C23.3333 8.74638 21.6117 5.85354 19 4.13574C16.3883 5.85354 14.6667 8.74638 14.6667 12C14.6667 15.2536 16.3883 18.1465 19 19.8643Z" fill="#FF5F00"/>
  </svg>
);

const LockIconSmall = () => (
  <svg className="w-3 h-3 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const AmexIcon = () => (
  // 1. Paste your <svg> tag here
  // 2. IMPORTANT: Remove width="..." and height="..." from your code
  // 3. Add className="w-10 h-auto"
  <svg className="w-10 h-auto" viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ... your path data goes here ... */}
      <path d="..." fill="#006FCF" />
  </svg>
);

// Example: If you have a Diners Club SVG
const DinersIcon = () => (
   <svg className="w-10 h-auto" viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg">
       {/* ... your path data goes here ... */}
   </svg>
);


// The New Shop Page - "The Space"
const Shop = ({ navigate, addToCart }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingShop, setLoadingShop] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = listenToCollection('shop', (items) => {
      setProducts(items);
      setLoadingShop(false);
    });
    return () => unsub && unsub();
  }, []);

  const items = products.length ? products : shopProducts;
  const { role } = useAuth();

  return (
    <div className="shop-stage-container flex flex-col relative">
      <div className="hero-smoke-video opacity-40 bg-gradient-to-t from-black to-transparent"></div> 
      <div className="shop-floor-reflection"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-gradient-to-b from-white/5 to-transparent opacity-30 pointer-events-none"></div>

      <div className="container mx-auto px-4 md:px-6 py-32 relative z-10 flex-grow flex flex-col">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter">The <span className="text-custom-gold">Shop</span></h1>
          {role === 'admin' && (
            <Link
              to="/admin"
              className="text-xs px-3 py-2 rounded border border-custom-gold text-custom-gold hover:bg-custom-gold hover:text-black"
            >
              Edit in Admin
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
          {items.map((product) => (
            <div
              key={product.id || product.name}
              className="glass-card rounded-xl p-4 flex flex-col items-center group cursor-pointer relative overflow-hidden transition-all duration-300 hover:border-custom-gold border border-transparent"
              onClick={() => setSelectedProduct(product)}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 opacity-0 group-hover:opacity-100 transition duration-500 z-10"></div>

              <div className="w-full h-64 overflow-hidden rounded-lg mb-4 bg-black/20 relative z-0">
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700 ease-in-out"
                  />
                )}
              </div>

              <div className="relative z-20 text-center transform translate-y-2 group-hover:translate-y-0 transition duration-500 w-full">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">
                  {product.category || 'Product'}
                </span>
                <h3 className="text-xl font-bold text-white group-hover:text-custom-gold transition">
                  {product.name}
                </h3>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {product.price?.toString().startsWith('R') ? product.price : `R ${product.price || ''}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">Or pay {toPriceNumber(product.price)} GG</p>
                <button className="mt-4 opacity-0 group-hover:opacity-100 transition duration-500 delay-100 bg-transparent border border-custom-gold text-custom-gold px-6 py-2 rounded text-xs font-bold uppercase hover:bg-custom-gold hover:text-black w-full md:w-auto">
                  View Product
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ShopModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        navigate={navigate}
        addToCart={addToCart}
      />
      <AdminFab label="Edit Shop" href="/admin" />
    </div>
  );
};

// --- Page Component: Home ---
const Home = ({navigate}) => {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [homePosts, setHomePosts] = useState([]);

  const [funFactVisible, setFunFactVisible] = useState(false);
  const funFactRef = useRef(null);
  const [graphVisible, setGraphVisible] = useState(false);
  const graphRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFunFactVisible(true); // Trigger animation when visible
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the element is visible
    );

    if (funFactRef.current) {
      observer.observe(funFactRef.current);
    }
  return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setGraphVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    if (graphRef.current) {
      observer.observe(graphRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 1. Create your list of reviews here.
  // 2. IMPORTANT: Replace the 'image' values with your imported profile pictures.
  const reviews = [
    {
      id: 1,
      name: 'Lynn Du Plooy',
      title: 'Furry Friend Owner',
      quote: "What a wonderful experience having a photoshoot with SHOCKWAVE. We can recommend these are the Guys To Go To.They made the experience so much fun. Our furry family member was treated as part of the family and welcomed and included into the photoshoot. Beautiful shots with the three of us where taken and we can't wait to see the outcome. Will definitely share photos when received. Super excited .",
      stars: 5,
      image: profileSarah // Use your imported image
    },
    {
      id: 2,
      name: 'Helena du Bruyn',
      title: 'Facility Manager | Bardolino Care Centre',
      quote: "SHOCKWAVE has been an incredible partner in growing our online presence. Their team is knowledgeable, results-driven, and always willing to go the extra mile to ensure our campaigns succeed. They take the time to understand our business goals and tailor strategies that deliver measurable results. Communication is always clear, deadlines are met, and the creativity they bring to the table sets them apart. Since working with SHOCKWAVE, weÃ¢â‚¬â„¢ve seen a significant improvement in engagement, signups, and overall brand visibility. Highly recommended for anyone looking for a reliable and innovative digital marketing partner.",
      stars: 5,
      image: profileJohn // Use your imported image
    },
    {
      id: 3,
      name: 'Eleanor-Rose Fourie',
      title: 'Professional photographer',
      quote: "SHOCKWAVE Photography is absolutely incredible! From the very first interaction, their friendliness stood out Ã¢â‚¬â€ honestly a 5/5 experience in every way. They made the whole photoshoot fun, relaxed, and professional at the same time. The quality of the photos blew me away Ã¢â‚¬â€ crisp, creative, and perfectly capturing what I needed for my brand. On top of that, IÃ¢â‚¬â„¢m beyond excited about the SEO strategy theyÃ¢â‚¬â„¢re rolling out for me. If their photography results are anything to go by, I have no doubt their SEO will skyrocket my online presence too! Highly recommend SHOCKWAVE Ã¢â‚¬â€ if you want a team thatÃ¢â‚¬â„¢s passionate, professional, and genuinely cares about your success, theyÃ¢â‚¬â„¢re the ones to call.",
      stars: 5,
      image: profileJane // Use your imported image
    }
  ];
  // --- Logic to get current, previous, and next reviews ---
  const totalReviews = reviews.length;
  const currentReview = reviews[currentReviewIndex];
  
  // Modulo (%) operator wraps the index around
  const prevReviewIndex = (currentReviewIndex - 1 + totalReviews) % totalReviews;
  const nextReviewIndex = (currentReviewIndex + 1) % totalReviews;
  
  const prevReview = reviews[prevReviewIndex];
  const nextReview = reviews[nextReviewIndex];

  // --- Click handlers for the arrow buttons ---
  const handleNextReview = () => {
    setCurrentReviewIndex(nextReviewIndex);
  };

  const handlePrevReview = () => {
    setCurrentReviewIndex(prevReviewIndex);
  };
  useEffect(() => {
    const unsub = listenToCollection('blog', (items) => {
      setHomePosts(items.slice(0, 3));
    });
    return () => unsub && unsub();
  }, []);
  const homeServices = [
    { id: 1, title: 'Web Development', icon: iconWeb, slug: 'web-development' },
    { id: 2, title: 'Printing', icon: iconPrinting, slug: 'printing' },
    { id: 3, title: 'Social Marketing', icon: iconSocial, slug: 'social-marketing' },
    { id: 4, title: 'Cybersecurity', icon: iconCyber, slug: 'cybersecurity' },
    { id: 5, title: 'Photography', icon: iconPhoto, slug: 'photography' },
  ];
return (
    <>
      <div className="hero-bg bg-custom-dark relative overflow-hidden min-h-screen flex items-center">
    {/* 1. Light trails (Background) 
       - Changed z-index to 10 so it sits BEHIND text
       - Added opacity-80 to make text more readable
    */}
    <img 
      src={goldLines} 
      alt="Light trails" 
      className="absolute top-0 left-0 w-full h-full object-cover z-20 opacity-80 pointer-events-none" 
    />
    
    {/* 2. Video (Background) */}
    <img 
      className="hero-smoke-video absolute top-0 left-0 w-full h-full object-cover z-0" 
      src={heroGif} 
      alt="Hero Background" 
    />
    
    {/* 3. Dark Overlay 
       - Increased opacity on mobile (bg-black/70) for better readability 
    */}
    <div className="absolute inset-0 bg-black/70 md:bg-black/60 z-10"></div>
    
    {/* 4. Main Content 
       - Changed padding to account for navbar
       - Used Flexbox to stack items vertically on mobile
    */}
    <div className="container mx-auto px-4 md:px-6 pt-32 pb-12 relative z-30 flex flex-col justify-center h-full">
        <div className="w-full max-w-4xl relative">
            {/* HEADLINES */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight">
                Built to <span className="text-custom-gold">Perform</span>
            </h1>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mt-2">
                Designed to <span className="text-custom-gold">Win</span>
            </h1>
            <div className="mt-6 max-w-2xl">
                <p className="text-lg md:text-xl text-gray-200" style={{ textShadow: '1px 1px 1px #000' }}>
                    We help mid-to-large businesses in the Garden Route get more
                    <span className="text-custom-gold font-semibold"> leads and bookings</span> with done-for-you digital marketing.
                </p>
                <p className="text-sm md:text-base text-gray-200 mt-3" style={{ textShadow: '1px 1px 1px #000' }}>
                    Websites, social media management, paid ads, content creation, and lead capture—handled end-to-end.
                </p>
            </div>

            {/* MOBILE FIX: 
               1. Removed 'absolute bottom-...' for mobile. 
               2. Added 'flex flex-col md:block' to handle layout switching.
               3. The button and text now stack naturally under the headline on mobile.
            */}
            

            <div className="mt-10 md:mt-16">
                <a
                  href="https://share.google/hUsP59FtvZHcA7Z95"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-4 rounded-full border border-white/20 bg-black/50 px-5 py-2.5 text-sm text-white/90 backdrop-blur-sm hover:border-custom-gold hover:text-custom-gold transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#4285F4' }} />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#DB4437' }} />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#F4B400' }} />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#0F9D58' }} />
                    </span>
                    <span className="font-semibold tracking-wide">Google Reviews</span>
                  </span>
                  <span className="h-4 w-px bg-white/20" />
                  <span className="flex items-center gap-2">
                    <span className="text-white font-bold text-base">4.9</span>
                    <span className="flex items-center gap-0.5 scale-90">
                      <StarIcon />
                      <StarIcon />
                      <StarIcon />
                      <StarIcon />
                      <StarIcon />
                    </span>
                  </span>
                </a>
            </div>
        </div>
    </div>

    {/* Scroll Indicator - Hidden on very small screens to save space, visible on md+ */}
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 hidden md:block">
        <div className="w-6 h-10 border-2 border-white/70 rounded-full relative"> 
            <div className="w-2 h-4 bg-white/70 rounded-full absolute top-2 left-1.5 -translate-x-1/2 animate-bounce"></div>
        </div>
    </div>

    {/* Social Links (Right Side) */}
    <div className="absolute top-1/2 right-[-70px] md:right-[-90px] transform rotate-90 -translate-y-1/2 z-30 text-white text-sm tracking-widest hidden md:block"
        style={{ textShadow: '1px 1px 1px #000' }}>
        <span className="font-semibold">Follow Us</span>
        <span className="text-gray-400 mx-2">-</span>
        <a href="https://www.facebook.com/p/SHOCKWAVE-61574788783029/" className="font-semibold hover:text-custom-gold">Facebook</a>
        <span className="text-gray-400 mx-2">/</span>
        <a href="https://www.instagram.com/shockwave_s/" className="font-semibold hover:text-custom-gold">Instagram</a>
    </div>
</div>

      <section className="bg-custom-gray py-20 relative overflow-hidden">
          {/* --- NEW: The Extension Lines Image --- */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            {/* ADJUSTMENT TIP: 
               Change 'w-[30%]' to match the thickness/width of the lines in the Hero section above.
               If the lines look disconnected, tweaking this Width % is the key.
            */}
          </div>

          {/* Content Container */}
          <div className="container mx-auto px-4 text-center relative z-10">
             <h1 className="text-4xl font-bold text-white mb-4">Our Fun Fact</h1>
             
             <p className="text-3xl font-bold text-gray-300" ref={funFactRef}>
                 Clients see a{' '}
                 <span 
                    className={`scroll-underline ${funFactVisible ? 'in-view' : ''} z-10 relative px-1`}
                    style={{ color: '#D4AF37' }}
                 >
                     327% increase
                 </span>
                 {' '}in engagement.
             </p>
          </div>
      </section>

      <section className="py-16 md:py-20 bg-custom-dark" ref={graphRef}>
          <div className="container mx-auto px-4 md:px-6">
              <div className="text-center">
                  <div className="flex justify-center mb-4">
                      <span className="inline-flex items-center rounded-full border border-custom-gold/40 bg-custom-gold/10 px-10 py-3 text-sm md:text-2xl font-bold uppercase tracking-[0.2em] text-custom-gold">
                          Proven momentum, trusted by 100+ clients
                      </span>
                  </div>
                  <div className="glass-card border border-custom-gold/20 rounded-2xl p-6 md:p-8">
                      <div className={`client-graph-stage ${graphVisible ? 'is-visible' : ''}`}>
                      <div className="graph-layer w-full relative z-10">
                          <svg viewBox="0 0 360 180" className="w-full h-44">
                              <defs>
                                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                      <stop offset="0%" stopColor="#3a3a3a" />
                                      <stop offset="100%" stopColor="#D4AF37" />
                                  </linearGradient>
                              </defs>
                              <g stroke="#3a3a3a" strokeWidth="1">
                                  <line x1="40" y1="20" x2="40" y2="150" />
                                  <line x1="40" y1="150" x2="340" y2="150" />
                                  <line x1="40" y1="20" x2="46" y2="20" />
                                  <line x1="40" y1="52" x2="46" y2="52" />
                                  <line x1="40" y1="84" x2="46" y2="84" />
                                  <line x1="40" y1="116" x2="46" y2="116" />
                                  <line x1="40" y1="150" x2="46" y2="150" />
                              </g>
                              <g fill="#9ca3af" fontSize="12" fontWeight="600">
                                  <text x="12" y="24">100+</text>
                                  <text x="16" y="56">75</text>
                                  <text x="16" y="88">50</text>
                                  <text x="16" y="120">25</text>
                                  <text x="20" y="154">0</text>
                              </g>
                              <path
                                  className="graph-line"
                                  d="M50 145 L110 122 L170 98 L230 66 L290 40 L340 22"
                                  stroke="url(#lineGrad)"
                                  strokeWidth="4"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeDasharray="360"
                                  strokeDashoffset="360"
                              />
                          </svg>
                      </div>
                      <div className="graph-label-final absolute inset-0 flex items-center justify-center text-4xl md:text-6xl lg:text-7xl font-extrabold text-white text-center px-4">
                          100+ clients fully satisfied
                      </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      <section className="py-16 md:py-24 relative z-10">
          <div className="container mx-auto px-4 md:px-6">
              <h2 className="text-4xl md:text-5xl font-extrabold text-center text-white mb-12">
                  Services we can <br /> <span className="text-custom-gold">help you with</span>
              </h2>
              
              {/* UPDATED: Using the 3-column Cube Grid (aspect-square) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {homeServices.map((service) => (
                      <div 
                          key={service.id}
                          onClick={() => navigate('services', service.slug)} // Navigates to Services page
                          className="group cursor-pointer relative overflow-hidden rounded-2xl aspect-square border border-gray-800 hover:border-custom-gold transition-all duration-500 hover:shadow-[0_0_20px_rgba(253,190,51,0.2)] hover:scale-[1.02]"
                      >
                          {/* 1. Background Image */}
                          <div className="absolute inset-0 bg-gray-900">
                                {/* Note: Using the icon as a background for effect, or you can import specific bg images */}
                              <img 
                                  src={service.icon} 
                                  alt={service.title} 
                                  className="w-full h-full object-cover opacity-50 group-hover:opacity-30 group-hover:scale-110 transition duration-700" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                          </div>                        

                          {/* 3. Bottom Text Content */}
                          <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-20">
                              <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-custom-gold transition leading-tight">{service.title}</h3>
                              
                              {/* Animated Line */}
                              <div className="h-1 bg-custom-gold mt-3 w-0 group-hover:w-12 transition-all duration-500"></div>
                              
                              <p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-gray-400 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100">
                                  View Pricing
                              </p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

     <section className="py-16 md:py-24 bg-custom-gray">
          <div className="container mx-auto px-4 md:px-6">
              <h2 className="text-4xl md:text-5xl font-extrabold text-center text-white">
                  SHOCKWAVE <span className="text-custom-gold">Portfolio</span>
              </h2>
              <p className="text-lg text-gray-300 text-center max-w-3xl mx-auto mt-4">
                  Photography and videography sit at the heart of our work. Get a moving preview of each before you dive into the full gallery.
              </p>

              <div className="gallery-bar mt-10">
                  <span className="gallery-label">Photography</span>
                  <button
                    onClick={() => navigate('portfolio')}
                    className="gallery-button"
                  >
                    View Gallery
                  </button>
                  <span className="gallery-label">Videography</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
                  <div className="portfolio-panel">
                      <div className="photo-preview">
                          <img className="photo-slide" src={frontier1} alt="Photography preview 1" />
                          <img className="photo-slide photo-slide--b" src={frontier2} alt="Photography preview 2" />
                          <img className="photo-slide photo-slide--c" src={frontier3} alt="Photography preview 3" />
                      </div>
                      <div className="portfolio-panel-overlay"></div>
                      <div className="portfolio-panel-content">
                          <p className="text-xs uppercase tracking-[0.3em] text-custom-gold">SHOCKWAVE: Photography</p>
                          <h3 className="text-3xl font-extrabold text-white">Story-led, cinematic stills</h3>
                          <p className="text-gray-300 max-w-md">
                            Sliding edits, layered fades, and editorial lighting that keeps every frame feeling alive.
                          </p>
                          <button onClick={() => navigate('portfolio')} className="panel-cta">
                            View Photography
                          </button>
                      </div>
                  </div>

                  <div className="portfolio-panel">
                      <div className="video-preview">
                          <img className="video-preview-media" src={heroGif} alt="Videography preview" />
                      </div>
                      <div className="portfolio-panel-overlay"></div>
                      <div className="portfolio-panel-content">
                          <p className="text-xs uppercase tracking-[0.3em] text-custom-gold">SHOCKWAVE: Videography</p>
                          <h3 className="text-3xl font-extrabold text-white">Landscape-driven motion</h3>
                          <p className="text-gray-300 max-w-md">
                            Wide compositions, moving texture, and a cinematic pace that builds atmosphere.
                          </p>
                          <button onClick={() => navigate('portfolio')} className="panel-cta">
                            View Videography
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </section>
      
      <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
              <h2 className="text-4xl md:text-5xl font-extrabold text-center">Our Blog</h2>
              <p className="text-lg text-gray-300 text-center mt-2">Explore recent publication</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                  {(homePosts.length ? homePosts : []).map((post) => (
                    <div key={post.id} className="bg-custom-card rounded-lg overflow-hidden glass-card border border-gray-800">
                        {post.image && (
                          <img src={post.image} alt={post.title} loading="lazy" className="w-full h-48 object-cover" />
                        )}
                        <div className="p-6 space-y-2">
                            <p className="text-xs uppercase tracking-[0.25em] text-custom-gold">{post.category || 'Blog'}</p>
                            <h3 className="text-xl font-bold text-white">{post.title}</h3>
                            <div className="text-gray-300 text-sm rich-text-content line-clamp-3" dangerouslySetInnerHTML={{ __html: post.excerpt || '' }} />
                            <button
                              onClick={() => navigate('blog')}
                              className="text-custom-gold font-semibold mt-2 inline-flex items-center gap-2 link-underline"
                            >
                              Read More <span>&rarr;</span>
                            </button>
                        </div>
                    </div>
                  ))}
                  {!homePosts.length && (
                    <>
                      {[blog1, blog2, blog3].map((img, idx) => (
                        <div key={idx} className="bg-custom-card rounded-lg overflow-hidden glass-card border border-gray-800">
                            <img src={img} alt="Blog placeholder" loading="lazy" className="w-full h-48 object-cover" />
                            <div className="p-6 space-y-2">
                                <p className="text-xs uppercase tracking-[0.25em] text-custom-gold">Blog</p>
                                <h3 className="text-xl font-bold text-white">New story coming soon</h3>
                                <p className="text-gray-400 text-sm">Fresh updates will appear here once published.</p>
                            </div>
                        </div>
                      ))}
                    </>
                  )}
              </div>
              <div className="text-center mt-12">
                  <button onClick={() => navigate('blog')} className="bg-custom-gold text-black font-bold py-3 px-8 rounded-md text-lg hover:bg-[#e5c76b] transition duration-300">
                      View Blog
                  </button>
              </div>
          </div>
      </section>

      {/* --- NEW CUBE SECTION WITH ANIMATION --- */}
       <section className="py-12 md:py-16 bg-custom-gray relative z-30">
        <div><h3 className="text-3xl text-custom-gold text-center mt-2 z-20"style={{ 
    textShadow: '2px 2px 2px #101010ff, -2px -2px 2px #101010ff, 2px -2px 2px #101010ff, -2px 2px 2px #101010ff'
  }}>Strong brands aren't lucky<br />they follow a blueprint.</h3></div>
         <div className="container mx-auto px-4 md:px-6 flex justify-end">
             {/* Added 'mr-12 md:mr-32' to push it away from the right edge */}
             <div className="w-fit mr-12 md:mr-32">
                <Real3DCube />
             </div>
         </div>
      </section>

     <section className="py-14 md:py-18 bg-custom-gray relative z-10 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-custom-gold mb-3">Google rating</p>
              <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                A 4.9-star reputation built on real results.
              </h3>
              <p className="text-gray-300 mt-4 max-w-xl">
                Clients trust SHOCKWAVE Digital Marketing to deliver performance that shows up in their reviews.
              </p>
              <a
                href="https://share.google/hUsP59FtvZHcA7Z95"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-3 mt-6 text-custom-gold font-semibold hover:text-white transition"
              >
                <span className="link-underline">View our Google badge</span>
                <span className="text-lg">&rarr;</span>
              </a>
            </div>

            <div className="flex justify-center md:justify-end">
              <div className="glass-card border border-custom-gold/30 rounded-2xl px-6 py-5 w-full max-w-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#4285F4' }} />
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#DB4437' }} />
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#F4B400' }} />
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#0F9D58' }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-white font-semibold leading-none">Google Badge</p>
                      <p className="text-xs text-gray-400">SHOCKWAVE Digital Marketing</p>
                    </div>
                  </div>
                  <span className="text-custom-gold text-xs font-bold uppercase tracking-[0.3em]">Trusted</span>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <span className="text-4xl font-extrabold text-white">4.9</span>
                  <div className="flex items-center gap-1">
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-2">Average rating on Google Reviews.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

     {/* --- STEP 4 (REFINED): ANIMATED DIAMOND TESTIMONIALS --- */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative">
          <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
            
            {/* LEFT: The Animated Diamond Graphic */}
            <div className="w-full md:w-1/3 flex justify-center md:justify-start relative">
               <div className="relative w-80 h-64 flex items-center justify-center">
                  
                  {/* Glow Effect */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-custom-gold blur-[100px] opacity-10 pointer-events-none"></div>

                  {/* 1. LEFT DIAMOND (Previous Reviewer) */}
                  <div 
                    key={`prev-${prevReview.id}`}
                    className="absolute left-0 w-24 h-24 border-2 border-gray-700 bg-gray-900 overflow-hidden z-0 transition-all duration-500 opacity-60 grayscale"
                    style={{ transform: 'translateX(20%)' }} // Tuck it behind slightly
                  >
                     <img 
                        src={prevReview.image} 
                        alt="Previous" 
                        className="w-full h-full object-cover scale-150" 
                     />
                  </div>
                  
                  {/* 2. RIGHT DIAMOND (Next Reviewer) */}
                  <div 
                    key={`next-${nextReview.id}`}
                    className="absolute right-0 w-24 h-24 border-2 border-gray-700 bg-gray-900 overflow-hidden z-0 transition-all duration-500 opacity-60 grayscale"
                    style={{ transform: 'translateX(-20%)' }} // Tuck it behind slightly
                  >
                     <img 
                        src={nextReview.image} 
                        alt="Next" 
                        className="w-full h-full object-cover scale-150" 
                     />
                  </div>

                  {/* 3. CENTER MAIN DIAMOND (Current Reviewer) */}
                  {/* Added 'key' to trigger animation on change */}
                  <div 
                    key={`curr-${currentReview.id}`}
                    className="relative w-36 h-36 border-4 border-custom-gold bg-gray-800 overflow-hidden z-0 shadow-[0_0_30px_rgba(253,190,51,0.3)] animate-fade-in"
                  >
                     <img 
                        src={currentReview.image} 
                        alt={currentReview.name} 
                        className="w-full h-full object-cover scale-150 transition-transform duration-700 hover:scale-[1.6]" 
                     />
                  </div>
                  
               </div>
            </div>

            {/* RIGHT: The Testimonial Text (Same as before) */}
            <div className="w-full md:w-2/3 text-left">
              {/* Large Quote Icon */}
              <div className="text-custom-gold mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.01697 21L5.01697 18C5.01697 16.8954 5.9124 16 7.01697 16H10.017C10.5693 16 11.017 15.5523 11.017 15V9C11.017 8.44772 10.5693 8 10.017 8H6.01697C5.46468 8 5.01697 8.44772 5.01697 9V11C5.01697 11.5523 4.56925 12 4.01697 12H3.01697V5H13.017V15C13.017 18.3137 10.3307 21 7.01697 21H5.01697Z" />
                </svg>
              </div>

              {/* Dynamic Content with Fade Animation */}
              <div key={currentReview.id} className="animate-fade-in">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  "Truly the SHOCKWAVE Team for <span className="text-custom-gold">Anything Creative!</span>"
                </h3>
                <p className="text-lg text-gray-300 leading-relaxed mb-8">
                  {currentReview.quote}
                </p>
                <div className="flex space-x-1 mb-4">
                   {Array.from({ length: currentReview.stars }).map((_, index) => (
                      <StarIcon key={index} />
                   ))}
                </div>
                <div>
                   <h4 className="text-xl font-bold text-white">{currentReview.name}</h4>
                   <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">{currentReview.title}</p>
                </div>
              </div>

              {/* Navigation Arrows */}
              <div className="flex justify-end gap-4 mt-8">
                <button 
                  onClick={handlePrevReview}
                  className="p-3 border border-gray-600 rounded text-gray-400 hover:border-custom-gold hover:text-custom-gold transition duration-300"
                >
                  <ArrowLeftIcon />
                </button>
                <button 
                  onClick={handleNextReview}
                  className="p-3 border border-gray-600 rounded text-gray-400 hover:border-custom-gold hover:text-custom-gold transition duration-300"
                >
                  <ArrowRightIcon />
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
              
              <div className="marquee-container relative mb-12">
                  <div className="animate-marquee">
                      <div className="marquee-content">
                          <h3 className="text-5xl font-extrabold text-black"
                          style={{ 
    textShadow: '2px 2px 2px #D4AF37ff, -2px -2px 2px #D4AF37ff, 2px -2px 2px #D4AF37ff, -2px 2px 2px #D4AF37ff'
  }}>Trusted all over the Garden Route</h3>
                         <h3 className="text-5xl font-extrabold text-black"
                          style={{ 
    textShadow: '2px 2px 2px #D4AF37ff, -2px -2px 2px #D4AF37ff, 2px -2px 2px #D4AF37ff, -2px 2px 2px #D4AF37ff'
  }}>Trusted all over the Garden Route</h3>
                          <h3 className="text-5xl font-extrabold text-black"
                          style={{ 
    textShadow: '2px 2px 2px #D4AF37ff, -2px -2px 2px #D4AF37ff, 2px -2px 2px #D4AF37ff, -2px 2px 2px #D4AF37ff'
  }}>Trusted all over the Garden Route</h3>
  <h3 className="text-5xl font-extrabold text-black"
                          style={{ 
    textShadow: '2px 2px 2px #D4AF37ff, -2px -2px 2px #D4AF37ff, 2px -2px 2px #D4AF37ff, -2px 2px 2px #D4AF37ff'
  }}>Trusted all over the Garden Route</h3>
  <h3 className="text-5xl font-extrabold text-black"
                          style={{ 
    textShadow: '2px 2px 2px #D4AF37ff, -2px -2px 2px #D4AF37ff, 2px -2px 2px #D4AF37ff, -2px 2px 2px #D4AF37ff'
  }}>Trusted all over the Garden Route</h3>
  <h3 className="text-5xl font-extrabold text-black"
                          style={{ 
    textShadow: '2px 2px 2px #D4AF37ff, -2px -2px 2px #D4AF37ff, 2px -2px 2px #D4AF37ff, -2px 2px 2px #D4AF37ff'
  }}>Trusted all over the Garden Route</h3>
  <h3 className="text-5xl font-extrabold text-black"
                          style={{ 
    textShadow: '2px 2px 2px #D4AF37ff, -2px -2px 2px #D4AF37ff, 2px -2px 2px #D4AF37ff, -2px 2px 2px #D4AF37ff'
  }}>Trusted all over the Garden Route</h3>
  <h3 className="text-5xl font-extrabold text-black"
                          style={{ 
    textShadow: '2px 2px 2px #D4AF37ff, -2px -2px 2px #D4AF37ff, 2px -2px 2px #D4AF37ff, -2px 2px 2px #D4AF37ff'
  }}>Trusted all over the Garden Route</h3>
                      </div>
                  </div>
              </div>

              <div className="flex flex-wrap justify-center gap-x-8 gap-y-6 md:gap-x-16">
                  
                  <div className="flex flex-col items-center space-y-2">
                      <img src={iconMosselbay} alt="Mosselbay Icon" className="rounded-full w-20 h-20 md:w-24 md:h-24" />
                      <span className="text-white font-bold text-lg">Mosselbay</span>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                      <img src={iconGeorge} alt="George Icon" className="rounded-full w-20 h-20 md:w-24 md:h-24" />
                      <span className="text-white font-bold text-lg">George</span>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                      <img src={iconKnysna} alt="Knysna Icon" className="rounded-full w-20 h-20 md:w-24 md:h-24" />
                      <span className="text-white font-bold text-lg">Knysna</span>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                      <img src={iconPlettenberg} alt="Plettenberg Icon" className="rounded-full w-20 h-20 md:w-24 md:h-24" />
                      <span className="text-white font-bold text-lg">Plettenberg</span>
                  </div>
                  
                  <div className="flex flex-col items-center space-y-2">
                      <img src={iconHartenbos} alt="Hartenbos Icon" className="rounded-full w-20 h-20 md:w-24 md:h-24" />
                      <span className="text-white font-bold text-lg">Hartenbos</span>
                  </div>

              </div>
          </div>
      </section>
      <CallToAction />
    </>
  );
};

// --- TEAM DATA & MODAL ---

// 1. YOUR TEAM'S DATA
// Edit this array to add bios, strengths, and weaknesses for each member.
const teamData = [
  {
    name: "Francois Coetzee",
    title: "CEO & Founder",
    image: iconFrancois, // Uses the image you imported
    bio: "As the founder of SHOCKWAVE, Francois's vision drives our relentless pursuit of innovation. He's passionate about building brands that last and creating strategies that deliver real-world results.",
    strengths: [
      "Strategic Vision & Brand Architecture",
      "Leadership & Team Building",
      "Client Relations & Pitching",
      "Market Analysis"
    ],
    weaknesses: [
      "Perfectionism (can slow things down!)",
      "Too many new ideas at once",
      "Hates administrative paperwork",
      "Coffee enthusiast (maybe *too* enthusiastic)"
    ]
  },
  {
    name: "Rualdo Kruger",
    title: "COO",
    image: iconRualdo, // Uses the image you imported
    bio: "Rualdo is the operational engine that keeps SHOCKWAVE running. With a keen eye for detail and process, he ensures every project is executed flawlessly, on time, and on budget.",
    strengths: [
      "Operations & Process Management",
      "Financial Oversight",
      "Project Scoping & Execution",
      "Technical Problem-Solving" 
    ],
    weaknesses: [
      "Always serious during project planning",
      "Over-invests in new tech gadgets",
      "Can't resist a complex problem",
      "Relies heavily on spreadsheets"
    ]
  },
  {
    name: "Reinart Steenberg",
    title: "Head 3D Designer",
    image: iconReinart, // Set to 'null' to use the placeholder
    bio: "The impactful force behind our identity. Reinart Steenberg guides our design teams, transforming abstract ideas into stunning visuals that captivate and convert.",
    strengths: [
      "Visual Branding & Identity",
      "UI/UX Design",
      "Creative Direction",
      "Photography & Videography"
    ],
    weaknesses: [
      "Spends too long picking the *perfect* font",
      "His computer has more RAM than our server",
      "Hates stock photos",
      "Judges all other company logos",
      "Believes there's always room for improvement and won't rate a 5-star"
    ]
  }
];

// 2. THE NEW MODAL COMPONENT
const TeamMemberModal = ({ member, onClose }) => {
  return (
    // Backdrop
    <div 
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
      onClick={onClose} // Close modal when clicking the backdrop
    >
      {/* Modal Panel */}
      <div 
        className="bg-custom-card rounded-lg max-w-4xl w-full mx-auto p-6 md:p-10 relative overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside it
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column (Image) */}
          <div className="md:col-span-1">
            <img 
              src={member.image ? member.image : "https://placehold.co/400x400/222222/FDBE33?text=Team+Member"} 
              alt={member.name} 
              className="rounded-lg w-full h-auto" 
            />
          </div>

          {/* Right Column (Info) */}
          <div className="md:col-span-2">
            <h2 className="text-4xl font-extrabold text-white">{member.name}</h2>
            <p className="text-xl font-bold text-custom-gold mt-1">{member.title}</p>

            <p className="text-gray-300 mt-6">{member.bio}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
              <div>
                <h4 className="text-2xl font-bold text-white mb-3">Strengths</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {member.strengths.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-2xl font-bold text-white mb-3">Weaknesses</h4>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {member.weaknesses.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
// --- Page Component: About ---
const About = () => {
  const [selectedMember, setSelectedMember] = useState(null);
  return (
    <div className="min-h-screen bg-custom-dark pb-24">
      
      {/* 2. NEW THINNER VIDEO HEADER */}
      <div className="relative w-full py-32 md:py-40 mb-16 overflow-hidden flex items-center justify-center">
        {/* Video Background */}
        <img 
            className="hero-smoke-video" 
            src={heroGif} 
            alt="Hero Background" 
          />
        {/* Dark Overlay for readability */}
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        
        {/* Content */}
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white">About <span className="text-custom-gold">Us</span></h1>
            <p className="text-lg text-gray-300 mt-6 max-w-2xl mx-auto">
              We don't just follow trends; we set them. Meet the team combining creative vision with technical precision to build your legacy.
            </p>
        </div>
      </div>
      
      <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                  {/* Left: Text Content */}
                  <div className="flex flex-col justify-center h-full">
                      <h3 className="text-sm font-bold tracking-widest text-custom-gold uppercase mb-2">About Our Agency</h3>
                      <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
                          Your trusted partner <br/> for business
                      </h2>
                      <p className="text-gray-400 text-lg leading-relaxed mb-6">
                          This is the main factor that sets us apart from our competition and allows us to deliver specialist business consultancy service. 
                      </p>
                      <p className="text-gray-400 text-lg leading-relaxed">
                          Our team applies its wide-ranging experience to determining. Through our years of experience, we've also learned that while each channel has its own set of advantages.
                      </p>
                  </div>

                  {/* Right: The Grid Layout from PDF Page 2 */}
                  <div className="grid grid-cols-2 gap-4">
                      {/* Top large image */}
                      <div className="col-span-2 h-64 bg-custom-card rounded-xl overflow-hidden border border-gray-800 relative group">
                          <img src={teamPic} alt="Team" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-500" />
                      </div>
                      {/* Bottom two smaller blocks */}
                      <div className="h-48 bg-custom-card rounded-xl overflow-hidden border border-gray-800 relative">
                          <img src="https://placehold.co/400x300/222222/FDBE33?text=Strategy" alt="Office 1" className="w-full h-full object-cover opacity-60" />
                      </div>
                      <div className="h-48 bg-gray-800 rounded-xl overflow-hidden border border-gray-700 relative flex items-center justify-center">
                          {/* Placeholder graphic or image */}
                          <img src="https://placehold.co/400x300/222222/FDBE33?text=Results" alt="Office 2" className="w-full h-full object-cover opacity-60" />
                      </div>
                  </div>
              </div>
          </div>
      </section>
      
      <section className="bg-custom-gray py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
              <div className="bg-custom-card rounded-lg p-8 md:p-12 text-center max-w-4xl mx-auto">
                  <h3 className="text-4xl font-semibold text-custom-gold">Our Fun Fact</h3>
                  <p className="mt-4 text-2xl md:text-4xl font-bold text-white">
                      Our clients typically see a <span className="text-custom-gold">327% increase</span> in engagement within 90 days. No fluff, just smart marketing.
                  </p>
              </div>
          </div>
      </section>
      
      <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  
                  {/* Left: Image with gold Accent Bar (Matches PDF Page 2) */}
                  <div className="relative">
                      <div className="absolute -left-4 top-4 bottom-4 w-2 bg-custom-gold rounded-l-md z-10"></div> {/* The gold Bar */}
                      <div className="rounded-xl overflow-hidden border border-gray-800 bg-custom-card relative h-[500px]">
                          <img src={digitalExcel} alt="Digital Excellence" className="w-full h-full object-cover opacity-90" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                      </div>
                  </div>

                  {/* Right: Text Content */}
                  <div className="pl-4 md:pl-8">
                      <h3 className="text-sm font-bold tracking-widest text-custom-gold uppercase mb-2">Why Choose Us</h3>
                      <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
                          Digital Excellence with <br/>
                          <span className="text-custom-gold">Built-In Protection</span>
                      </h2>
                      <p className="text-gray-300 text-lg leading-relaxed mb-6">
                          What sets SHOCKWAVE apart is our ability to combine standout creative solutions with a growing focus on cybersecurity.
                      </p>
                      
                      {/* Stylized paragraph separator */}
                      <div className="w-16 h-1 bg-custom-gold mb-6"></div>

                      <p className="text-gray-400 text-lg leading-relaxed">
                          In a world where online threats grow daily, we believe digital excellence and cyber awareness should go hand in hand. We integrate essential digital hygiene principles into our client journey.
                      </p>
                  </div>
              </div>
          </div>
      </section>
      
      <section className="py-16 md:py-24 bg-custom-gray">
          <div className="container mx-auto px-4 md:px-6 justify-center">
            <div className="w-fit">
              <h2 className="text-4xl md:text-5xl font-extrabold text-center">The Team</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-20 mt-20">
                {teamData.map((member, index) => (
                  <div 
                    key={index} 
                    className="text-center cursor-pointer group"
                    onClick={() => setSelectedMember(member)} // 2. SETS THE STATE ON CLICK
                  >
                    <img 
                        src={member.image ? member.image : "https://placehold.co/400x400/222222/FDBE33?text=Team+Member"} 
                        alt={member.name} 
                        loading="lazy"
                        className="rounded-lg w-full h-auto transition-transform duration-300 group-hover:scale-105 team-photo" 
                      />
                      <h4 className="text-xl font-bold text-white mt-4">{member.name}</h4>
                      <p className="text-custom-gold">{member.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </section>

      <CallToAction />
    {selectedMember && (
        <TeamMemberModal 
          member={selectedMember} 
          onClose={() => setSelectedMember(null)} 
        />
      )}
    </div>
  );
};

// --- Page Component: Services ---
const pricingData = {
  'web-development': {
    title: 'Web Development Pricing',
    packages: [
      {
        name: 'Landing Page',
        tier: 'bronze', // NEW: Identifier for color logic
        price: 'R4,500',
        features: ['Single-page site', 'Contact Form', 'Mobile Responsive', 'Basic SEO'],
      },
      {
        name: 'Business Site',
        tier: 'silver',
        price: 'R8,500',
        features: ['5-Page Site', 'CMS Integration', 'Mobile Responsive', 'Advanced SEO', 'Blog Setup'],
        highlight: true,
      },
      {
        name: 'E-Commerce',
        tier: 'gold',
        price: 'R15,000',
        features: ['Full Online Store', 'Payment Gateway', 'Product Management', 'Shopping Cart', 'Marketing Suite'],
      },
    ],
  },
  'printing': {
    title: 'Printing Services',
    packages: [
      {
        name: 'Starter Pack',
        tier: 'bronze',
        price: 'R1,200',
        features: ['500 Business Cards', '1000 A5 Flyers'],
      },
      {
        name: 'Business Bundle',
        tier: 'silver',
        price: 'R3,500',
        features: ['1000 Business Cards', '5000 A5 Flyers', '2x A1 Posters', '5x Notepads'],
        highlight: true,
      },
      {
        name: 'Corporate Event',
        tier: 'gold',
        price: 'Custom',
        features: ['Custom Banners', 'Event Backdrops', 'Brochures', 'Name Badges'],
      },
    ],
  },
  'social-marketing': {
    title: 'Social Marketing Pricing',
    packages: [
      {
        name: 'Bronze',
        tier: 'bronze',
        price: 'R5,500',
        features: ['1 Platform (FB)', '20 Posts/mo', '1 Influencer Collab', 'R500 Ad Spend', 'Standard Support'],
      },
      {
        name: 'Silver',
        tier: 'silver',
        price: 'R7,000',
        features: ['2 Platforms', '25 Posts/mo', '2 Influencer Collabs', '1 Studio Shoot', 'R1,500 Ad Spend'],
        highlight: true,
      },
      {
        name: 'Gold',
        tier: 'gold',
        price: 'R9,000',
        features: ['3 Platforms', '25 Posts/mo', '3-4 Influencer Collabs', '2 Event Shoots', 'R2,500 Ad Spend'],
      },
      {
        name: 'Platinum',
        tier: 'platinum',
        price: 'R12,000+',
        features: ['Multi-Platform', 'Custom Volume', 'VIP Network Access', 'On-site Content Days', 'Dedicated Strategist'],
      },
    ],
  },
  'photography': {
    title: 'Photography Pricing',
    packages: [
      {
        name: 'Product Shoot',
        tier: 'bronze',
        price: 'R2,500',
        features: ['Half-Day Shoot', '20 Retouched Images', 'White Background'],
      },
      {
        name: 'Brand Lifestyle',
        tier: 'silver',
        price: 'R5,500',
        features: ['Full-Day Shoot', '50 Retouched Images', 'Multiple Locations'],
        highlight: true,
      },
      {
        name: 'Event Coverage',
        tier: 'gold',
        price: 'R8,500',
        features: ['Full Event', 'All Usable Images', 'Candid & Staged', '24h Highlights'],
      },
    ],
  },
  'cybersecurity': {
    title: 'Cybersecurity Packages',
    packages: [
      {
        name: 'Audit',
        tier: 'bronze',
        price: 'R3,500',
        features: ['Vulnerability Scan', 'Network Report', 'Firewall Check'],
      },
      {
        name: 'Protection',
        tier: 'silver',
        price: 'R7,500',
        features: ['24/7 Monitoring', 'Managed Firewall', 'Endpoint Protection'],
        highlight: true,
      },
      {
        name: 'Compliance',
        tier: 'gold',
        price: 'R12,500',
        features: ['POPIA/GDPR', 'Penetration Testing', 'Staff Training'],
      },
    ],
  },
  'recruitment': {
    title: 'Recruitment Packages',
   packages: [
      {
        name: 'Audit',
        tier: 'bronze',
        price: 'R3,500',
        features: ['Vulnerability Scan', 'Network Report', 'Firewall Check'],
      },
      {
        name: 'Protection',
        tier: 'silver',
        price: 'R7,500',
        features: ['24/7 Monitoring', 'Managed Firewall', 'Endpoint Protection'],
        highlight: true,
      },
      {
        name: 'Compliance',
        tier: 'gold',
        price: 'R12,500',
        features: ['POPIA/GDPR', 'Penetration Testing', 'Staff Training'],
      },
    ],
  },
};

// --- Custom Smooth Scroll Helper ---
const animateScrollTo = (targetElement, duration = 800) => {
  if (!targetElement) return;

  const targetPosition = targetElement.getBoundingClientRect().top;
  const startPosition = window.pageYOffset;
  // We subtract 100px to give it a little breathing room (offset) from the top
  const distance = targetPosition - 100; 
  let startTime = null;

  const animation = (currentTime) => {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    
    // Easing function (easeInOutQuad) for a natural feel
    // It starts slow, speeds up, then slows down at the end
    const run = (t, b, c, d) => {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t + b;
      t--;
      return -c / 2 * (t * (t - 2) - 1) + b;
    };

    const nextScrollY = run(timeElapsed, startPosition, distance, duration);

    window.scrollTo(0, nextScrollY);

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    } else {
      // Ensure we land exactly on the spot at the end
      window.scrollTo(0, startPosition + distance);
    }
  };

  requestAnimationFrame(animation);
};

// Admin-only floating action button to jump into the dashboard
const AdminFab = ({ label = 'Edit', href = '/admin' }) => {
  const { role } = useAuth();
  if (role !== 'admin') return null;
return (
    <Link
      to={href}
      className="fixed bottom-6 right-6 z-[120] flex items-center gap-2 px-4 py-3 rounded-full glass-card border border-custom-gold/40 text-white hover:bg-custom-gold hover:text-black transition shadow-lg"
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-custom-gold text-black font-extrabold text-xl leading-none">+</span>
      <span className="text-sm font-bold uppercase tracking-widest hidden sm:inline">{label}</span>
    </Link>
  );
};

const Services = ({ navigate, addToCart }) => {
  const [selectedService, setSelectedService] = useState('social-marketing');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [servicesData, setServicesData] = useState([]);

  useEffect(() => {
    if (!db) return;
    const unsub = listenToCollection('services', (items) => setServicesData(items));
    return () => unsub && unsub();
  }, []);

  const mappedServices = servicesData.map((svc, idx) => {
    const slug = (svc.slug || svc.name || `service-${idx}`).toLowerCase().replace(/\s+/g, '-');
    return {
      id: svc.id || slug,
      title: svc.name,
      icon: svc.image || iconWeb,
      slug,
      desc: svc.summary || svc.details || '',
      price: svc.price || '',
      details: svc.details || '',
    };
  });
  
  const servicesList = mappedServices.length ? mappedServices : [
    { id: 1, title: 'Web Development', icon: iconWeb, slug: 'web-development', desc: 'Custom sites & apps' },
    { id: 2, title: 'Printing', icon: iconPrinting, slug: 'printing', desc: 'Business cards to banners' },
    { id: 3, title: 'Social Marketing', icon: iconSocial, slug: 'social-marketing', desc: 'Campaigns that convert' },
    { id: 4, title: 'Cybersecurity', icon: iconCyber, slug: 'cybersecurity', desc: 'Protect your digital assets' },
    { id: 5, title: 'Photography', icon: iconPhoto, slug: 'photography', desc: 'Professional shoots' },
    { id: 6, title: 'Recruitment Agency', icon: iconPhoto, slug: 'recruitment', desc: 'Professional Recruiting' },
  ];
  // 1. Create a reference for the pricing section
  // 1. Create a reference for the pricing section (Keep this from previous step)
  const pricingRef = useRef(null);

  const dynamicPricing = mappedServices.reduce((acc, svc) => {
    acc[svc.slug] = {
      title: svc.title,
      packages: [{
        name: svc.title,
        tier: 'gold',
        price: svc.price || 'Custom quote',
        features: (svc.details && svc.details.split('\n').filter(Boolean)) ||
                  (svc.desc ? [svc.desc] : ['Full service package']),
        highlight: true,
      }],
    };
    return acc;
  }, {});
  const currentPricing = (dynamicPricing[selectedService] || pricingData[selectedService]) ?? null;

  useEffect(() => {
    if (servicesList.length && !servicesList.find((s) => s.slug === selectedService)) {
      setSelectedService(servicesList[0].slug);
    }
  }, [servicesList, selectedService]);

  const serviceIcons = {
    'web-development': iconWeb,
    printing: iconPrinting,
    'social-marketing': iconSocial,
    photography: iconPhoto,
    cybersecurity: iconCyber,
    recruitment: iconPhoto,
  };

  const handleServiceClick = (slug) => {
    setSelectedService(slug);
    if (pricingRef.current) animateScrollTo(pricingRef.current, 800);
  };

  const handlePackageClick = (pkg) => {
    const pkgWithImage = {
      ...pkg,
      image: serviceIcons[selectedService] || logo,
      description: pkg.features.join(', '),
    };
    setSelectedPackage(pkgWithImage);
  };

  const packages = currentPricing?.packages || [];
  const headingTitle = currentPricing?.title || 'Services';
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-custom-dark pb-24">
      
      {/* 2. NEW THINNER VIDEO HEADER */}
      <div className="relative w-full py-32 md:py-40 mb-16 overflow-hidden flex items-center justify-center">
        <img 
            className="hero-smoke-video" 
            src={heroGif} 
            alt="Hero Background" 
          />
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white">Our <span className="text-custom-gold">Services</span></h1>
            <p className="text-lg text-gray-300 mt-6 max-w-2xl mx-auto">
              From pixel-perfect designs to military-grade cybersecurity. Everything you need to build, scale, and protect your brand online.
            </p>
            {role === 'admin' && (
              <Link
                to="/admin"
                className="text-xs px-3 py-2 rounded border border-custom-gold text-custom-gold hover:bg-custom-gold hover:text-black"
              >
                Edit in Admin
              </Link>
            )}
        </div>
      </div>
      
     
         <section className="py-16 md:py-24 relative overflow-hidden">
          {/* PDF-Style Background Decor (gold Circles) */}
          <div className="absolute top-20 left-0 w-64 h-64 bg-custom-gold rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
          
          <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col lg:flex-row gap-16">
                  
                  {/* LEFT COLUMN: Sticky Title (Matches PDF Page 3 left side) */}
                  <div className="lg:w-1/3 lg:sticky lg:top-32 h-fit z-10">
                      <h3 className="text-4xl font-bold tracking-widest text-custom-gold uppercase mb-4">What Can We Do</h3>
                      <h2 className="text-4xl md:text-3xl font-extrabold text-white leading-tight">
                          Services we can <br/>
                          <span className="relative inline-block">
                              help you with
                              {/* Decorative gold Circle behind text */}
                              <span className="absolute -z-10 -top-4 -right-8 w-24 h-24 bg-custom-gold rounded-full opacity-20 blur-xl"></span>
                          </span>
                      </h2>
                      <p className="text-gray-400 mt-6 text-lg">
                          Select a service from the grid to view our tiered pricing packages.
                      </p>
                  </div>

                  {/* RIGHT COLUMN: The Image Grid (Matches PDF Page 3 right side) */}
                  {/* RIGHT COLUMN: The Image Grid */}
                  <div className="lg:w-2/3">
                      {/* Grid set to 3 columns. 'gap-6' gives nice spacing between cubes */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          {servicesList.map((service) => {
                              const isSelected = selectedService === service.slug;
                              
                              return (
                                  <div 
                                      key={service.id}
                                      onClick={() => handleServiceClick(service.slug)}
                                      className={`
                                          group cursor-pointer relative overflow-hidden rounded-2xl aspect-square
                                          transition-all duration-500 border border-gray-800
                                          ${isSelected ? 'ring-4 ring-custom-gold shadow-[0_0_20px_rgba(253,190,51,0.4)] scale-105 z-10' : 'hover:border-gray-600 hover:scale-[1.02]'}
                                      `}
                                  >
                                      {/* 1. Full Background Image */}
                                      <div className="absolute inset-0 bg-gray-900">
                                          <img 
                                              src={service.icon} 
                                              alt={service.title} 
                                              className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-110 transition duration-700" 
                                          />
                                          {/* Gradient Overlay for Text Readability */}
                                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                                      </div>

                                      {/* 2. Content Positioned at Bottom */}
                                      <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-20">
                                          <h3 className={`text-lg md:text-xl font-bold leading-tight transition-colors duration-300 ${isSelected ? 'text-custom-gold' : 'text-white group-hover:text-custom-gold'}`}>
                                              {service.title}
                                          </h3>
                                          
                                          {/* Animated Line */}
                                          <div className={`h-1 bg-custom-gold mt-3 transition-all duration-500 ${isSelected ? 'w-12' : 'w-0 group-hover:w-12'}`}></div>
                                          
                                          {/* "Viewing" Label - Only shows when selected */}
                                          {isSelected && (
                                            <p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-white animate-fade-in">
                                                Currently Viewing
                                            </p>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              
              </div>
          </div>
      </section>
      <section ref={pricingRef} className="py-16 md:py-24 bg-custom-gray">
          <div className="container mx-auto px-4 md:px-6">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white text-center">{headingTitle}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-12 max-w-7xl mx-auto">
                {packages.map((pkg, index) => {
                  
                  // 1. Define Color Logic based on Tier
                  let tierStyles = "";
                  let buttonStyles = "";
                  let textAccent = "";

                  switch(pkg.tier) {
                    case 'bronze':
                      // Bronze: #CD7F32
                      tierStyles = "hover:border-[#CD7F32] hover:shadow-[0_0_30px_rgba(205,127,50,0.3)]";
                      buttonStyles = "group-hover:bg-[#CD7F32] group-hover:text-black";
                      textAccent = "group-hover:text-[#CD7F32]";
                      break;
                    case 'silver':
                      // Silver: #C0C0C0
                      tierStyles = "hover:border-[#C0C0C0] hover:shadow-[0_0_30px_rgba(192,192,192,0.3)]";
                      buttonStyles = "group-hover:bg-[#C0C0C0] group-hover:text-black";
                      textAccent = "group-hover:text-[#C0C0C0]";
                      break;
                    case 'gold':
                      // Gold: #D4AF37 (Your Custom gold)
                      tierStyles = "hover:border-[#D4AF37] hover:shadow-[0_0_30px_rgba(253,190,51,0.3)]";
                      buttonStyles = "group-hover:bg-[#D4AF37] group-hover:text-black";
                      textAccent = "group-hover:text-[#D4AF37]";
                      break;
                    case 'platinum':
                      // Divine Blue: #3B82F6 (Royal/Electric Blue)
                      tierStyles = "hover:border-[#3B82F6] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]";
                      buttonStyles = "group-hover:bg-[#3B82F6] group-hover:text-black";
                      textAccent = "group-hover:text-[#3B82F6]";
                      break;
                    default:
                      tierStyles = "hover:border-white";
                  }

                  // 2. Adjust Grid Spanning (If 4 items, span 1. If 3 items, span 1 but maybe center the grid)
                  // The parent grid is now set to lg:grid-cols-4 to accommodate the Platinum tier.

                  return (
                    <div key={index} 
                         className={`
                           glass-card rounded-xl p-8 border border-transparent 
                           transition-all duration-500 ease-in-out group cursor-pointer
                           flex flex-col
                           ${tierStyles}
                           ${pkg.highlight ? 'md:-translate-y-4 z-10' : ''}
                         `}
                         onClick={() => handlePackageClick(pkg)}
                    >
                        {/* Tier Label */}
                        <span className={`text-xs font-bold tracking-widest uppercase text-gray-500 mb-2 transition-colors duration-300 ${textAccent}`}>
                          {pkg.tier}
                        </span>

                        <h3 className="text-2xl font-bold text-white group-hover:text-white transition-colors">{pkg.name}</h3>
                        
                        <div className="my-6">
                           <p className={`text-4xl font-extrabold text-white transition-colors duration-300 ${textAccent}`}>{pkg.price}</p>
                        </div>

                        {/* Features List */}
                        <ul className="space-y-4 mb-8 flex-grow">
                          {pkg.features.map((feature, fIndex) => (
                            <li key={fIndex} className="flex items-start text-gray-400 group-hover:text-gray-300 transition-colors">
                              {/* Checkmark matches the tier color on hover */}
                              <span className={`mr-3 mt-1 transition-colors duration-300 ${textAccent}`}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              </span>
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Button */}
                        <button className={`
                          w-full py-3 px-6 rounded-lg font-bold text-sm uppercase tracking-wider
                          border border-gray-600 text-white bg-transparent
                          transition-all duration-300
                          ${buttonStyles}
                        `}>
                          Select Package
                        </button>
                    </div>
                  );
                })}
              </div>
          </div>
      </section>
      
      <ShopModal 
  product={selectedPackage} 
  onClose={() => setSelectedPackage(null)} 
  navigate={navigate} 
  addToCart={addToCart} // This was missing!
/>
      <AdminFab label="Edit Services" href="/admin" />
      <CallToAction />
    </div>
  );
};

// --- Other Page Components (Placeholders) ---
const ironmanPhotos = [
  { id: 1, src: ironman1, title: 'The Long Run' }, // Replace with actual Ironman pics
  { id: 2, src: ironman2, title: 'Crowd Energy' },
  { id: 3, src: ironman3, title: 'Bicycle Uphill' },
  { id: 4, src: ironman4, title: 'Bicycle Downhill' },
];

const frontierPhotos = [
  { id: 1, src: frontier1, title: 'Frontier Medix' }, // Replace with Frontier Medix pics
  { id: 2, src: frontier2, title: 'On-point' },
  { id: 3, src: frontier3, title: 'Professional' },
  { id: 4, src: frontier4, title: 'Collective' },
];

const LockIcon = () => (
  <svg className="w-16 h-16 text-custom-gold mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
  </svg>
);

const Portfolio = () => {
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  useEffect(() => {
    const scrollToSection = sessionStorage.getItem('scrollToPrivate');
    if (scrollToSection === 'true') {
      const element = document.getElementById('private-session');
      if (element) setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      sessionStorage.removeItem('scrollToPrivate');
    }
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsub = listenToCollection('portfolio', (items) => {
      setPortfolioItems(items);
      setLoadingPortfolio(false);
    });
    return () => unsub && unsub();
  }, []);

  const hasLivePortfolio = portfolioItems.length > 0;
  const rowRefs = useRef({});
  const scrollRow = (rowKey, direction) => {
    const row = rowRefs.current[rowKey];
    if (!row) return;
    const firstCard = row.querySelector('[data-portfolio-card]');
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 360;
    const gap = 24;
    row.scrollBy({ left: direction * (cardWidth + gap), behavior: "smooth" });
  };
  // Helper to render a scrollable row
  const renderPortfolioRow = (title, photos, link, rowKey) => (
    <div className="portfolio-row">
      <div className="portfolio-row-head">
        <h3 className="portfolio-row-title">{title}</h3>
        <div className="portfolio-row-actions group">
          <button type="button" onClick={() => scrollRow(rowKey, -1)} className="portfolio-nav">
            Prev
          </button>
          <button type="button" onClick={() => scrollRow(rowKey, 1)} className="portfolio-nav">
            Next
          </button>
          <a href={link} target="_blank" rel="noreferrer" className="portfolio-row-link link-underline">
            View Full Gallery &rarr;
          </a>
        </div>
      </div>
      <div
        ref={(el) => { rowRefs.current[rowKey] = el; }}
        className="portfolio-row-track flex overflow-x-auto pb-8 gap-6 px-4 snap-x snap-mandatory scrollbar-hide"
      >
        {photos.map((photo, index) => (
          <a
            key={index}
            href={link}
            target="_blank"
            rel="noreferrer"
            data-portfolio-card
            className="snap-center shrink-0 w-80 md:w-96 glass-card rounded-xl p-4 flex flex-col items-center group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 opacity-0 group-hover:opacity-100 transition duration-500 z-30"></div>
            <div className="w-full h-64 overflow-hidden rounded-lg mb-4">
              <img src={photo.src} alt={photo.title} className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700" />
            </div>
            <div className="relative z-40 text-center transform translate-y-2 group-hover:translate-y-0 transition duration-500">
              <h4 className="text-xl font-bold text-white group-hover:text-custom-gold transition">{photo.title}</h4>
              <span className="text-xs text-gray-400 mt-2 inline-block opacity-0 group-hover:opacity-100 transition delay-100 link-underline">
                Click to view gallery
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );

    const renderVideoRow = (title, link) => (
    <div className="portfolio-row">
      <div className="portfolio-row-head">
        <h3 className="portfolio-row-title">{title}</h3>
        <div className="portfolio-row-actions group">
          <a href={link} target="_blank" rel="noreferrer" className="portfolio-row-link link-underline">
            View Full Gallery &rarr;
          </a>
        </div>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="glass-card rounded-xl p-4 flex flex-col items-center group cursor-pointer relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 opacity-0 group-hover:opacity-100 transition duration-500 z-10"></div>
        <div className="w-full h-64 overflow-hidden rounded-lg">
          <img src={heroGif} alt="Videography preview" className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700" />
        </div>
      </a>
    </div>
  );

  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-custom-dark pb-24">
      
      {/* 2. NEW THINNER VIDEO HEADER */}
      <div className="relative w-full py-32 md:py-40 mb-16 overflow-hidden flex items-center justify-center">
        <img 
            className="hero-smoke-video" 
            src={heroGif} 
            alt="Hero Background" 
          />
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white">Our <span className="text-custom-gold">Work</span></h1>
            <p className="text-lg text-gray-300 mt-6 max-w-2xl mx-auto">
              Capturing moments of endurance, precision, and raw emotion. Explore our recent public events below.
            </p>
            {role === 'admin' && (
              <Link
                to="/admin"
                className="text-xs px-3 py-2 rounded border border-custom-gold text-custom-gold hover:bg-custom-gold hover:text-black"
              >
                Edit in Admin
              </Link>
            )}
        </div>
      </div>
      <section className="py-6 md:py-10">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-4xl md:text-5xl font-extrabold text-center text-white">
            SHOCKWAVE <span className="text-custom-gold">Portfolio</span>
          </h2>
          <p className="text-lg text-gray-300 text-center max-w-3xl mx-auto mt-4">
            Two focused divisions, one shared vision. Explore photography and videography side by side.
          </p>

          <div className="gallery-bar text-center mt-10">
            <span className="gallery-label"></span>
            <a
              href="https://SHOCKWAVEdigitalmarketing.pixieset.com/"
              target="_blank"
              rel="noreferrer"
              className="gallery-button"
            >
              View Gallery
            </a>
            <span className="gallery-label"></span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
            <div className="flex flex-col gap-6">
              <div className="portfolio-panel">
                <div className="photo-preview">
                  <img className="photo-slide" src={frontier1} alt="Photography preview 1" />
                  <img className="photo-slide photo-slide--b" src={frontier2} alt="Photography preview 2" />
                  <img className="photo-slide photo-slide--c" src={frontier3} alt="Photography preview 3" />
                </div>
                <div className="portfolio-panel-overlay"></div>
                <div className="portfolio-panel-content">
                  <p className="text-xs uppercase tracking-[0.3em] text-custom-gold">SHOCKWAVE: Photography</p>
                  <h3 className="text-3xl font-extrabold text-white">Still frames that feel cinematic</h3>
                  <p className="text-gray-300 max-w-md">
                    Editorial photo sets, fast-moving event coverage, and private sessions with total discretion.
                  </p>
                  <a
                    href="https://SHOCKWAVEdigitalmarketing.pixieset.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="panel-cta"
                  >
                    View Photography
                  </a>
                </div>
              </div>

              <div id="portfolio-photography" className="portfolio-folder">
                {renderPortfolioRow(
                  "IRONMAN ISUZU 70.3",
                  ironmanPhotos,
                  "https://SHOCKWAVEdigitalmarketing.pixieset.com/ironman2025/",
                  "ironman"
                )}

                {renderPortfolioRow(
                  "FRONTIER MEDIX",
                  frontierPhotos,
                  "https://SHOCKWAVEdigitalmarketing.pixieset.com/frontiermedix/",
                  "frontier"
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="portfolio-panel">
                <div className="video-preview">
                  <img className="video-preview-media" src={heroGif} alt="Videography preview" />
                </div>
                <div className="portfolio-panel-overlay"></div>
                <div className="portfolio-panel-content">
                  <p className="text-xs uppercase tracking-[0.3em] text-custom-gold">SHOCKWAVE: Videography</p>
                  <h3 className="text-3xl font-extrabold text-white">Wide compositions, moving stories</h3>
                  <p className="text-gray-300 max-w-md">
                    Commercial edits, launch films, and social-first reels with a clean, cinematic finish.
                  </p>
                  <button className="panel-cta">
                    View Videography
                  </button>
                </div>
              </div>

              <div className="portfolio-folder">
                {renderVideoRow(
                  "FEATURE FILM PREVIEW",
                  "https://SHOCKWAVEdigitalmarketing.pixieset.com/"
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 3. PRIVATE SESSIONS (Blurry/Locked Section) */}
      <div className="container mx-auto px-4 md:px-6 mt-24">
        <div className="relative rounded-2xl overflow-hidden border border-gray-800">
          
          {/* The Blurred Background Image (Suggests content without showing it) */}
          <div className="absolute inset-0 bg-cover bg-center filter blur-xl scale-110 opacity-30" 
               style={{ backgroundImage: `url(${portfolio1})` }}>
          </div>
          
          {/* The Dark Overlay */}
          <div className="absolute inset-0 bg-black/60"></div>

          {/* The Content */}
          <div id="private-session" className="relative z-10 py-24 px-6 text-center flex flex-col items-center justify-center">
            <div className="bg-black/40 backdrop-blur-md p-8 md:p-12 rounded-2xl border border-custom-gold/30 shadow-2xl max-w-3xl">
              <LockIcon />
              <h3 className="text-3xl font-extrabold text-white mb-4">Private & Confidential</h3>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed font-light">
                "Your privacy is our priority. We offer exclusive private sessions with a strict <span className="text-custom-gold font-bold">Non-Disclosure Guarantee</span>. 
                At your request, your images remain offline never shared on our website or social media. For your eyes only."
              </p>
              
              {/* Updated to open Email */}
              <a 
                href="mailto:shockwave.office@gmail.com?subject=Private Session Inquiry"
                className="mt-8 inline-block bg-transparent border border-custom-gold text-custom-gold px-8 py-3 rounded hover:bg-custom-gold hover:text-black font-bold uppercase tracking-widest transition duration-300"
              >
                Book a Private Session
              </a>
            </div>
          </div>
          {hasLivePortfolio ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolioItems.map((item) => (
              <div key={item.id} className="glass-card rounded-xl p-4 border border-gray-800 flex flex-col gap-3">
                {item.image && (
                  <div className="rounded-lg overflow-hidden h-52 bg-black/30">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.tags?.join(', ')}</p>
                </div>
                <p className="text-gray-300 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
          ) : (
            <>
            
            </>
            )}
        </div>
      </div>

      <AdminFab label="Edit Portfolio" href="/admin" />
    </div>
  );
};

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!db) return;
    const unsub = listenToCollection('blog', (items) => {
      setPosts(items);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-custom-dark pb-24">
      <div className="relative w-full py-32 md:py-40 mb-16 overflow-hidden flex items-center justify-center">
        <img className="hero-smoke-video" src={heroGif} alt="Hero Background" />
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white">
            Our <span className="text-custom-gold">Blog</span>
          </h1>
          <p className="text-lg text-gray-300 mt-6 max-w-2xl mx-auto">
            Insights from the frontlines. Fresh content updates live from Firestore.
          </p>
          {role === 'admin' && (
            <Link
              to="/admin"
              className="text-xs px-3 py-2 rounded border border-custom-gold text-custom-gold hover:bg-custom-gold hover:text-black"
            >
              Edit in Admin
            </Link>
          )}
        </div>
      </div>

      <AdminFab label="Edit Blog" href="/admin" />
      <div className="container mx-auto px-4">
        {loading && <p className="text-center text-gray-400">Loading articles...</p>}
        {!loading && posts.length === 0 && (
          <p className="text-center text-gray-400">No posts yet. Add one in the Admin.</p>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => setSelected(post)}
              className="glass-card border border-gray-800 rounded-2xl p-6 space-y-3 text-left w-full hover:border-custom-gold transition"
            >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-custom-gold">{post.category}</p>
                <h3 className="text-2xl font-bold text-white">{post.title}</h3>
              </div>
              </div>
            {post.image && (
              <div className="rounded-lg overflow-hidden bg-black/30 h-40">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div
              className="text-gray-100 text-base leading-7 rich-text-content"
              dangerouslySetInnerHTML={{ __html: post.excerpt }}
            />
              <span className="text-custom-gold font-semibold text-sm inline-flex items-center gap-2">
                Read more
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelected(null)}></div>
          <div className="relative bg-custom-card border border-custom-gold/40 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-fade-in">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-custom-gold blur-[140px] opacity-10 pointer-events-none"></div>
            <div className="flex justify-between items-start p-6 border-b border-gray-800">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-custom-gold">{selected.category}</p>
                <h3 className="text-3xl font-extrabold text-white mt-1">{selected.title}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-white p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start max-h-[70vh]">
                {selected.image && (
                  <div className="md:col-span-2 w-full bg-black/40 rounded-lg overflow-hidden h-48 md:h-56">
                    <img src={selected.image} alt={selected.title} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className={`${selected.image ? 'md:col-span-3' : 'md:col-span-5'} overflow-y-auto max-h-[60vh] space-y-4 text-gray-100 leading-7 rich-text-content`}>
                  {selected.excerpt && (
                    <div
                      className="text-gray-100 text-lg"
                      dangerouslySetInnerHTML={{ __html: selected.excerpt }}
                    />
                  )}
                  {selected.body ? (
                    <div className="text-gray-100 text-base md:text-lg" dangerouslySetInnerHTML={{ __html: selected.body }} />
                  ) : (
                    <p className="text-gray-500 text-sm">No body content provided.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Account / Loyalty Page ---
const AccountRewards = ({ user }) => {
  const loyalty = {
    tier: 'SCOUT',
    rollingSpend: 0,
    balance: 0,
    missions: [
      { key: 'first_purchase', label: 'First Blood', points: 50, completed: false },
      { key: 'review', label: 'The Loudspeaker (Review)', points: 100, completed: false },
      { key: 'referral', label: 'The Headhunter (Referral)', points: 1000, completed: false },
    ],
    rewards: [
      { id: 'credit-100', name: 'R100 Account Credit', costPoints: 100 },
      { id: 'audit', name: 'Free SEO Audit', costPoints: 450 },
      { id: 'session', name: 'Strategy Session', costPoints: 650 },
    ],
  };

  const { nextTier, spendToNext, progressPct } = nextTierProgress(loyalty.tier, loyalty.rollingSpend);

  return (
    <div className="bg-custom-dark min-h-screen pt-32 pb-24">
      <div className="container mx-auto px-4 md:px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-custom-gold">The SHOCKWAVE Guild</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-2">Account & Rewards</h1>
            <p className="text-gray-300 mt-3">Track your GG Points, tier progress, and missions in one place.</p>
          </div>
          {!user && (
            <Link to="/login" className="bg-custom-gold text-black font-bold px-4 py-3 rounded-lg shadow hover:bg-white transition">
              Sign in to sync
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass-card border border-gray-800 rounded-xl p-6 space-y-2">
            <p className="text-sm text-gray-400">Available</p>
            <p className="text-4xl font-extrabold text-white">{loyalty.balance} {CURRENCY_NAME}</p>
            <p className="text-gray-300">Ã¢â€°Ë† R{formatRandValue(loyalty.balance)}</p>
            <p className="text-xs text-gray-500">Earn: R28.57 = 1 GG. Redeem: 1 GG = R1.</p>
          </div>

          <div className="glass-card border border-gray-800 rounded-xl p-6 space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-custom-gold">Status</p>
                <h3 className="text-2xl font-bold text-white">{loyalty.tier}</h3>
                <p className="text-sm text-gray-400">Rolling 12m spend: R{loyalty.rollingSpend.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Next: {nextTier}</p>
                <p className="text-sm text-white">{spendToNext > 0 ? `R${spendToNext.toLocaleString()} to upgrade` : 'Top tier reached'}</p>
              </div>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-custom-gold" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-gray-500">Cashback: Scout 3.5% | Captain 4.5% | General 5.5% ...</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass-card border border-gray-800 rounded-xl p-6 space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Missions</h3>
              <span className="text-xs text-gray-400">One-off bonuses</span>
            </div>
            <div className="space-y-2">
              {loyalty.missions.map((m) => (
                <div key={m.key} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                  <div>
                    <p className="text-white">{m.label}</p>
                    <p className="text-sm text-gray-400">+{m.points} GG</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${m.completed ? 'bg-custom-gold text-black font-bold' : 'border border-gray-700 text-gray-300'}`}>
                    {m.completed ? 'Completed' : 'Available'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card border border-gray-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Rewards</h3>
              <span className="text-xs text-gray-400">Redeem with GG</span>
            </div>
            <div className="space-y-2">
              {loyalty.rewards.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                  <div>
                    <p className="text-white">{r.name}</p>
                    <p className="text-sm text-gray-400">{r.costPoints} GG</p>
                  </div>
                  <button className="text-xs px-3 py-1 rounded bg-gray-700 text-gray-300 cursor-not-allowed">
                    Soon
                  </button>
                </div>
              ))}
            </div>
            <Link to="/rewards" className="block text-center text-sm text-custom-gold mt-2 hover:underline">
              View stamps & rewards
            </Link>
          </div>
        </div>

        <div className="glass-card border border-gray-800 rounded-xl p-6 space-y-2">
          <h3 className="text-lg font-bold text-white">How points are calculated</h3>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>Service fees earn points at R28.57 = 1 GG, multiplied by your tier.</li>
            <li>Ad spend is excluded from points.</li>
            <li>1 GG = R1 when redeeming.</li>
            <li>Missions give one-off bonuses for key actions.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};


const Pages = () => (
  <div className="container mx-auto px-4 md:px-6 py-36 md:py-48 text-center">
      <h1 className="text-5xl font-extrabold text-white">Pages</h1>
      <p className="text-lg text-gray-300 mt-4">This is a placeholder for other pages. Check back soon!</p>
  </div>
);

// --- NEW SECURE CHECKOUT PAGE ---
const SecureCheckout = ({ cart, checkoutUser }) => {
  
  // 1. Calculate Total
  const total = cart.reduce((sum, item) => {
    const priceVal = toPriceNumber(item.price);
    return sum + (priceVal * item.qty);
  }, 0);

  // 2. The Redirect Function
  const handleProceedToPayment = () => {
    // A. Save Cart & User to LocalStorage so we can retrieve it after payment
    localStorage.setItem('temp_cart', JSON.stringify(cart));
    localStorage.setItem('temp_user', JSON.stringify(checkoutUser));
    localStorage.setItem('temp_total', total);

    // B. Redirect to our "Clean Room" page
    // We pass the amount in CENTS (Total * 100)
    const amountInCents = Math.ceil(total * 100);
    const userName = checkoutUser?.name || 'Guest';
    
    window.location.href = `/pay.html?amount=${amountInCents}&name=${encodeURIComponent(userName)}`;
  };

  // 3. Trigger immediately on mount, or show a button
  // Let's show a button to be safe and give the user feedback
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-6">Proceeding to Payment Gateway...</h2>
            <div className="glass-card p-8 rounded-xl max-w-md mx-auto border border-custom-gold/30">
                <p className="text-gray-300 mb-6">You are about to be redirected to a secure payment page.</p>
                <div className="flex justify-between text-xl font-bold text-custom-gold mb-8 border-t border-b border-gray-700 py-4">
                    <span>Total to Pay</span>
                    <span>R {total}</span>
                </div>
                
                <button 
                    onClick={handleProceedToPayment}
                    className="w-full bg-custom-gold text-black font-extrabold text-lg py-4 rounded-lg hover:bg-white transition duration-300 shadow-lg"
                >
                    Click to Pay Now
                </button>
            </div>
        </div>
    </div>
  );
};

// --- Main App Component ---
// This is the root of your application.
export function MainSite() {
  const [page, setPage] = useState('home');
  // Global Cart State
  const [cart, setCart] = useState([]);
  const [checkoutUser] = useState({ name: '', email: '' });
  const [loyalty, setLoyalty] = useState({ balance: 0, tier: 'SCOUT', rolling12mSpend: 0 });
  const [stampState, setStampState] = useState(() => getStoredStampState());
  const cartCount = useMemo(() => getCartItemCount(cart), [cart]);
  const { user } = useAuth();

  const applyStampUpdate = (updater, reason = 'local') => {
    setStampState((prev) => {
      const nextState = normalizeStampState(typeof updater === 'function' ? updater(prev) : updater);
      persistStampState(nextState);
      if (user?.uid) {
        setRewardState(user.uid, user.email || '', nextState, reason);
        logActivity({ type: 'rewards:update', uid: user.uid, email: user.email || '', reason, collected: nextState.collectedStamps });
      }
      return nextState;
    });
  };

  // QR Stamp Rewards: purchases fill the next missing stamp slot to keep progress in sync with QR scans.
  const awardPurchaseStamp = () => {
    let latest = normalizeStampState(stampState);
    applyStampUpdate(
      (prev) => {
        latest = addNextMissingStamp(prev);
        return latest;
      },
      'purchase'
    );
    return latest;
  };

  useEffect(() => {
    setStampState(getStoredStampState());
  }, []);

  useEffect(() => {
    const loadLoyalty = async () => {
      if (!user?.uid) {
        setLoyalty({ balance: 0, tier: 'SCOUT', rolling12mSpend: 0 });
        return;
      }
      await ensureLoyaltyDoc(user.uid, user.email || '');
      const state = await getLoyaltyState(user.uid);
      setLoyalty({
        balance: state.balance || 0,
        tier: state.tier || 'SCOUT',
        rolling12mSpend: state.rolling12mSpend || 0,
      });
    };
    loadLoyalty();
  }, [user]);

  useEffect(() => {
    const syncReward = async () => {
      if (!user?.uid) return;
      await ensureRewardDoc(user.uid, user.email || '');
      const localState = getStoredStampState();
      const remote = await getRewardState(user.uid);
      const source = remote || localState;
      if (source) {
        setStampState(source);
        persistStampState(source);
        if (!remote && user?.uid) {
          setRewardState(user.uid, user.email || '', source, 'local_merge');
        }
      }
    };
    syncReward();
  }, [user]);
  
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            // Check if node is an Element (not text)
            if (node.nodeType === 1) { 
               
               // 1. Check if the node ITSELF is the Yoco iframe
               const isYocoIframe = (node.tagName === 'IFRAME' && node.src && node.src.includes('yoco'));
               
               // 2. Check if the node is a WRAPPER that CONTAINS the Yoco iframe
               // (This is the part that was missing)
               const hasYocoChild = node.querySelector && node.querySelector('iframe[src*="yoco"]');

               if (isYocoIframe || hasYocoChild) {
                   // Apply God Mode to the element that was added (the wrapper)
                   node.style.setProperty('z-index', '2147483647', 'important');
                   node.style.setProperty('position', 'fixed', 'important');
                   node.style.setProperty('top', '0', 'important');
                   node.style.setProperty('left', '0', 'important');
                   node.style.setProperty('width', '100%', 'important');
                   node.style.setProperty('height', '100%', 'important');
               }
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect(); 
  }, []);

  useEffect(() => {
    // Check if we just returned from a successful payment
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get('payment_success');
    const paymentId = params.get('id');

    if (isSuccess === 'true' && paymentId) {
        // 1. Retrieve the data we saved before leaving
        const savedCart = JSON.parse(localStorage.getItem('temp_cart') || '[]');
        const savedUser = JSON.parse(localStorage.getItem('temp_user') || '{}');
        const savedTotal = localStorage.getItem('temp_total');

        if (savedCart.length > 0) {
            // 2. Save the Order to Firebase
            saveOrder({ 
                items: savedCart, 
                total: savedTotal, 
                customer: savedUser, 
                paymentId: paymentId 
            }).then(async () => {
                const updatedRewards = awardPurchaseStamp();
                const progressMessage = `You now have ${updatedRewards.collectedStamps.length} of ${REQUIRED_STAMP_COUNT} stamps toward your free photoshoot.`;
                await awardPointsForPurchase(savedTotal);
                logActivity({ type: 'order:paid', uid: user?.uid, email: user?.email || savedUser?.email || '', paymentId, total: savedTotal });
                alert(`Payment Successful! Your order has been recorded.\n${progressMessage}`);
            });

            // 3. Clear the Cart and Storage
            setCart([]); // Clear React State
            localStorage.removeItem('temp_cart');
            localStorage.removeItem('temp_user');
            localStorage.removeItem('temp_total');
            
            // 4. Clean the URL (remove ?payment_success=true)
            window.history.replaceState({}, document.title, "/");
        }
    }
}, []);

  const navigate = (pageName) => {
    setPage(pageName);
    window.scrollTo(0, 0);
  };

  const awardPointsForPurchase = async (amount) => {
    if (!user?.uid) return;
    const amountZar = Number(amount) || 0;
    if (amountZar <= 0) return;
    try {
      await ensureLoyaltyDoc(user.uid, user.email || '');
      const res = await addPointsForUser({
        uid: user.uid,
        email: user.email || '',
        amountZar,
        source: 'order_paid',
        rolling12mSpend: loyalty.rolling12mSpend || 0,
      });
      if (res?.newBalance !== undefined) {
        setLoyalty((prev) => ({ ...prev, balance: res.newBalance }));
      }
      logActivity({ type: 'rewards:points_earn', uid: user?.uid, email: user?.email || '', amountZar, points: res?.pointsAwarded || 0 });
    } catch (e) {
      console.error('Failed to award points', e);
    }
  };
  // Add to Cart Function
  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(p => p.id === product.id && p.name === product.name);
      if (existing) {
        return prevCart.map(p => (p.id === product.id && p.name === product.name) ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  // Remove from Cart
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(p => p.id !== productId));
  };

  const handleRedeemWithPoints = async (cartItems = [], totalOverride = null) => {
    if (!user) {
      alert('Please log in to use GG points.');
      navigate('account');
      return;
    }
    const total = totalOverride !== null ? totalOverride : cartItems.reduce((sum, item) => {
      const priceVal = toPriceNumber(item.price);
      return sum + priceVal * (item.qty || 1);
    }, 0);

    if (total <= 0) {
      alert('Cart total must be greater than zero.');
      return;
    }

    try {
      await ensureLoyaltyDoc(user.uid, user.email || '');
      const res = await redeemCartWithPoints({ uid: user.uid, email: user.email || '', cartItems });
      setLoyalty((prev) => ({ ...prev, balance: res?.newBalance ?? Math.max(0, (prev.balance || 0) - total) }));
      setCart([]);
      logActivity({ type: 'order:redeem', uid: user?.uid, email: user?.email || '', total });
      alert(`Redeemed ${total} GG. New balance: ${res?.newBalance ?? Math.max(0, (loyalty.balance || 0) - total)} GG.`);
      navigate('home');
    } catch (e) {
      alert(e?.message || 'Redeem failed. Please try again.');
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'home': return <Home navigate={navigate} />;
      case 'about': return <About />;
      // Inside the switch(page) in the App component:

      case 'services': return <Services navigate={navigate} addToCart={addToCart} />;
      case 'portfolio': return <Portfolio />;
      case 'blog': return <Blog />;
      case 'account': return <AccountRewards user={user} />;
      case 'shop': return <Shop navigate={navigate} addToCart={addToCart} />;
      case 'cart': return <Cart cart={cart} removeFromCart={removeFromCart} navigate={navigate} loyaltyBalance={loyalty.balance} onRedeemWithPoints={handleRedeemWithPoints} />;
      case 'checkout': return <SecureCheckout cart={cart} navigate={navigate} checkoutUser={checkoutUser} />;
      case 'pages': return <Pages />;
      default: return <Home navigate={navigate} />;
    }
  };
 return (
    <div className="bg-custom-dark min-h-screen flex flex-col">
      
      {/* 1. HIDE HEADER ON CHECKOUT */}
      {page !== 'checkout' && (
        <Header navigate={navigate} currentPage={page} cartCount={cartCount} />
      )}

      <main className="flex-grow">
        {renderPage()}
      </main>

      {/* 2. HIDE FOOTER ON CHECKOUT */}
      {page !== 'checkout' && (
        <Footer navigate={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <GlobalStyles />
        <Routes>
          <Route path="/rewards/:codeId" element={<RewardCodeRedirect />} />
          <Route path="/rewards" element={<StampRewardsPage />} />
          <Route path="/reward" element={<RewardClaim />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/*" element={<MainSite />} />
        </Routes>
        {/* Global floating chat widget */}
        <Chatbot />
      </Router>
    </AuthProvider>
  );
}
