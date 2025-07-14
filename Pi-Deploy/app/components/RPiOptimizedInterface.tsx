'use client';

import { useEffect, useState } from 'react';
import { 
  isRaspberryPi, 
  getRPiOptimizedConfig, 
  RPiPerformanceMonitor,
  deferOnRPi 
} from '@/lib/rpiOptimizations';

interface RPiOptimizedInterfaceProps {
  children: React.ReactNode;
}

export function RPiOptimizedInterface({ children }: RPiOptimizedInterfaceProps) {
  const [isRPi, setIsRPi] = useState(false);
  const [lowPerformance, setLowPerformance] = useState(false);
  const [config, setConfig] = useState(getRPiOptimizedConfig());

  useEffect(() => {
    // Detect Raspberry Pi
    setIsRPi(isRaspberryPi());
    
    // Start performance monitoring on RPi
    if (isRaspberryPi()) {
      const monitor = new RPiPerformanceMonitor();
      monitor.startMonitoring();
      
      // Listen for performance warnings
      const handleLowPerf = () => setLowPerformance(true);
      window.addEventListener('rpi-low-performance', handleLowPerf);
      
      // Apply RPi-specific styles
      document.body.classList.add('raspberry-pi');
      
      return () => {
        window.removeEventListener('rpi-low-performance', handleLowPerf);
      };
    }
  }, []);

  // Apply performance optimizations
  useEffect(() => {
    if (!isRPi) return;

    // Disable smooth scrolling
    document.documentElement.style.scrollBehavior = 'auto';
    
    // Reduce animation durations
    const style = document.createElement('style');
    style.textContent = `
      .raspberry-pi * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
      }
      
      .raspberry-pi .reduced-motion * {
        animation: none !important;
        transition: none !important;
      }
      
      /* Optimize rendering */
      .raspberry-pi {
        will-change: auto !important;
        transform: translateZ(0);
      }
      
      /* Simplify shadows and effects */
      .raspberry-pi * {
        box-shadow: none !important;
        text-shadow: none !important;
        filter: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [isRPi]);

  // Performance warning banner
  const PerformanceWarning = () => {
    if (!lowPerformance) return null;
    
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black p-2 text-center z-50">
        <p className="text-sm font-medium">
          Performance mode activated - some features disabled
        </p>
      </div>
    );
  };

  return (
    <div className={`rpi-optimized-container ${isRPi ? 'is-raspberry-pi' : ''}`}>
      <PerformanceWarning />
      {children}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && isRPi && (
        <div className="fixed bottom-0 right-0 bg-black/80 text-white p-2 text-xs font-mono">
          <div>RPi Mode: Active</div>
          <div>Animations: {config.ui.enableAnimations ? 'ON' : 'OFF'}</div>
          <div>Sample Rate: {config.audio.sampleRate}Hz</div>
        </div>
      )}
    </div>
  );
}