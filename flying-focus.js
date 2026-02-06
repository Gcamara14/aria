(function() {
    'use strict';
  
    // 1. Accessibility Check: Do not run if user prefers reduced motion
    var mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      return; // Exit immediately
    }
  
    var DURATION = 300;
    var VISIBLE_DURATION = 500;
    var ringElem = null;
    var movingId = 0;
    var prevFocused = null;
    var keyDownTime = 0;
  
    var docElem = document.documentElement;
  
    docElem.addEventListener('keydown', function(event) {
      var code = event.which;
      // Track Tab (9) and Arrow keys (37-40)
      if (code === 9 || (code > 36 && code < 41)) {
        keyDownTime = Date.now();
      }
    }, false);
  
    docElem.addEventListener('focus', function(event) {
      var target = event.target;
      if (target.id === 'flying-focus') return;
  
      // 2. Performance: Use requestAnimationFrame to avoid blocking the main thread immediately
      requestAnimationFrame(() => {
          var isFirstFocus = false;
          if (!ringElem) {
              isFirstFocus = true;
              initialize();
          }
  
          var offset = offsetOf(target);
          
          // Batch style reads/writes
          ringElem.style.transform = `translate(${offset.left}px, ${offset.top}px)`;
          ringElem.style.width  = target.offsetWidth + 'px';
          ringElem.style.height = target.offsetHeight + 'px';
  
          if (isFirstFocus || Date.now() - keyDownTime >= 42) {
              return;
          }
  
          onEnd();
          target.classList.add('flying-focus_target');
          ringElem.classList.add('flying-focus_visible');
          prevFocused = target;
          movingId = setTimeout(onEnd, VISIBLE_DURATION);
      });
    }, true);
  
    docElem.addEventListener('blur', function() {
      onEnd();
    }, true);
  
    function initialize() {
      ringElem = document.createElement('flying-focus');
      ringElem.id = 'flying-focus';
      // Use transform for better performance than top/left
      ringElem.style.transition = `transform ${DURATION/1000}s cubic-bezier(0,1,0,1), width ${DURATION/1000}s cubic-bezier(0,1,0,1), height ${DURATION/1000}s cubic-bezier(0,1,0,1)`;
      document.body.appendChild(ringElem);
    }
  
    function onEnd() {
      if (!movingId) return;
      clearTimeout(movingId);
      movingId = 0;
      ringElem.classList.remove('flying-focus_visible');
      if (prevFocused) prevFocused.classList.remove('flying-focus_target');
      prevFocused = null;
    }
  
    function offsetOf(elem) {
      var rect = elem.getBoundingClientRect();
      var scrollLeft = window.pageXOffset || docElem.scrollLeft;
      var scrollTop  = window.pageYOffset || docElem.scrollTop;
      return {
        left: rect.left + scrollLeft,
        top:  rect.top  + scrollTop
      };
    }
  
    // Inject styles
    var style = document.createElement('style');
    style.textContent = `
      #flying-focus {
        position: absolute;
        left: 0; 
        top: 0;
        pointer-events: none;
        visibility: hidden;
        border: 2px solid #fff;
        box-shadow: 0 0 0 2px #015fcc, 0 0 0 4px #015fcc;
        border-radius: 3px;
        z-index: 9999;
      }
      #flying-focus.flying-focus_visible {
        visibility: visible;
      }
      .flying-focus_target {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);
  })();