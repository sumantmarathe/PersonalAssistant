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
