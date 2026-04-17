'use strict';

// Bottom navigation: active state management
const navBtns = document.querySelectorAll('.nav-btn');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const page = btn.dataset.page;
    console.log(`Navigating to: ${page}`);
    // TODO: render page content dynamically
  });
});
