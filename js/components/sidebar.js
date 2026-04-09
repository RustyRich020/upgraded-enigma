/* ============================================================
   components/sidebar.js — Mobile sidebar / hamburger toggle
   ============================================================ */

/**
 * Initialize sidebar behavior: hamburger toggle for mobile, nav click handling, overlay.
 */
export function initSidebar() {
  const nav = document.querySelector('nav');
  if (!nav) return;

  // Create hamburger button if it doesn't exist
  let hamburger = document.getElementById('hamburgerBtn');
  if (!hamburger) {
    hamburger = document.createElement('button');
    hamburger.id = 'hamburgerBtn';
    hamburger.className = 'btn hamburger';
    hamburger.innerHTML = '&#9776;';
    hamburger.style.cssText = 'display:none;position:fixed;top:16px;left:16px;z-index:150;font-size:20px;padding:8px 12px;';
    document.body.appendChild(hamburger);
  }

  // Create overlay if it doesn't exist
  let overlay = document.getElementById('sidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:90;';
    document.body.appendChild(overlay);
  }

  // Show hamburger on small screens
  function checkWidth() {
    if (window.innerWidth <= 768) {
      hamburger.style.display = 'block';
      nav.classList.add('sidebar-collapsed');
    } else {
      hamburger.style.display = 'none';
      overlay.style.display = 'none';
      nav.classList.remove('sidebar-collapsed');
      nav.classList.remove('sidebar-open');
    }
  }

  // Toggle sidebar
  hamburger.addEventListener('click', () => {
    const isOpen = nav.classList.contains('sidebar-open');
    if (isOpen) {
      nav.classList.remove('sidebar-open');
      overlay.style.display = 'none';
    } else {
      nav.classList.add('sidebar-open');
      overlay.style.display = 'block';
    }
  });

  // Close sidebar on overlay click
  overlay.addEventListener('click', () => {
    nav.classList.remove('sidebar-open');
    overlay.style.display = 'none';
  });

  // Close sidebar when a nav button is clicked (mobile)
  nav.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        nav.classList.remove('sidebar-open');
        overlay.style.display = 'none';
      }
    });
  });

  window.addEventListener('resize', checkWidth);
  checkWidth();
}

export default { initSidebar };
