/**
 * App - Master Personal Assistant Shell Controller
 * Manages modular sub-applications, routing, and lifecycle.
 */
class MainApp {
  constructor() {
    this.activeApp = 'budget';
  }

  async init() {
    console.log('Personal Assistant Portal: Initializing master shell...');
    
    // Bind app switcher navigation tabs
    const navTabs = document.querySelectorAll('.app-nav .nav-tab');
    navTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetApp = tab.dataset.app;
        if (targetApp === 'budget') {
          navTabs.forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          this.switchApp(targetApp);
        } else {
          // Future modular apps notification
          if (window.budgetApp) {
            window.budgetApp.showToast(`The ${tab.textContent.trim()} module will be delivered in upcoming sprints!`, 'success');
          }
        }
      });
    });

    // Initialize the primary active sub-app (Budget Planner)
    if (window.budgetApp) {
      await window.budgetApp.init();
    }

    // Initialize Progressive Web App (PWA) capabilities
    this.initPWA();
  }

  initPWA() {
    // 1. Register Service Worker for offline execution
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => {
            console.log('PWA: ServiceWorker registered successfully with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('PWA: ServiceWorker registration skipped/failed:', error);
          });
      });
    }

    // 2. Handle beforeinstallprompt for in-app install button
    const installBtn = document.getElementById('btn-install-pwa');
    let deferredPrompt = null;

    // If already running in standalone display mode, keep button hidden
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      console.log('PWA: Running in standalone display mode');
      if (installBtn) installBtn.style.display = 'none';
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent automatic mini-infobar on mobile Chrome
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) {
        installBtn.style.display = 'inline-flex';
      }
      console.log('PWA: beforeinstallprompt captured, ready for user installation');
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        console.log(`PWA: User response to install prompt: ${choiceResult.outcome}`);
        deferredPrompt = null;
      });
    }

    window.addEventListener('appinstalled', () => {
      console.log('PWA: Personal Assistant was successfully installed');
      if (installBtn) {
        installBtn.style.display = 'none';
      }
    });
  }

  switchApp(appName) {
    this.activeApp = appName;
    console.log(`Switched active sub-app to: ${appName}`);
  }
}

// Bootstrap once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mainApp = new MainApp();
  window.mainApp.init();
});
