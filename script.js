const copyBtn = document.getElementById('copy-email-btn');
    const copyMsg = document.getElementById('copy-email-msg');
    copyBtn.onclick = function() {
      navigator.clipboard.writeText('shantanu.khilare.16@gmail.com').then(function() {
        copyMsg.style.display = 'inline';
        setTimeout(() => { copyMsg.style.display = 'none'; }, 1500);
      });
    };
const copyEmailBtn = document.getElementById('copy-mobile-btn');
const copyMobileMsg = document.getElementById('copy-mobile-msg');
copyEmailBtn.onclick = function() {
    navigator.clipboard.writeText('8446631782').then(function() {
    copyMobileMsg.style.display = 'inline';
    setTimeout(() => { copyMobileMsg.style.display = 'none'; }, 1500);
    });
};



anime({
    targets: '.socials',
    translateY: [-20, 0],
    opacity: [0, 1],
    delay: anime.stagger(100, {start: 500}),
    duration: 1000,      
    });
anime({
targets: '.heading',
translateX: 250,
});

var hiAnimation = lottie.loadAnimation({
    container: document.getElementById('lottie-animation-hi'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'https://lottie.host/8b4d4351-4d3c-4ce1-85ee-c9a2c0ff55fd/1X2XaldF3p.json' // 👈 Replace with your Lottie file path
  });

  var projectAnimation = lottie.loadAnimation({
    container: document.getElementById('lottie-animation-projects'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'https://lottie.host/c59225de-8bf6-4147-9ccf-a1002747e629/b67acloNv4.json' // 👈 Replace with your Lottie file path
  });

    var contactsAnimation = lottie.loadAnimation({
    container: document.getElementById('lottie-animation-contacts'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'https://lottie.host/217fc371-d6b4-4396-a2af-cd790f5b8164/FzVfzDRbaJ.json' // 👈 Replace with your Lottie file path
  });