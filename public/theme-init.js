(function () {
  var root = document.documentElement;
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'dark' && t !== 'light') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.dataset.theme = t;
  } catch (e) {
    root.dataset.theme = 'light';
  }
})();
