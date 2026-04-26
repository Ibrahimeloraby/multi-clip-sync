/**
 * PersonalizeAI JavaScript SDK v1.0
 * Drop-in personalisation for any website.
 *
 * Usage:
 *   <script src="https://cdn.personalizeai.com/sdk/v1/personalize.js"></script>
 *   <script>
 *     PersonalizeAI.init({ apiKey: 'pk_live_xxx', baseUrl: 'https://api.personalizeai.com' });
 *   </script>
 *
 * Auto-track mode (zero config after init):
 *   data-personalize="for-you"         → renders For You widget
 *   data-personalize="trending"        → renders Trending Now widget
 *   data-personalize="top"             → renders Top 10 widget
 *   data-personalize="similar"         → renders Similar Items (needs data-item-id)
 *   data-personalize="continue"        → renders Continue Where You Left Off
 *   data-personalize="next-action"     → renders Next Best Action banner
 *   data-personalize="because-actioned"→ renders Because You Viewed widget
 *
 * Manual API:
 *   PersonalizeAI.track('view', { itemId: 'sku-123' });
 *   PersonalizeAI.track('purchase', { itemId: 'sku-123', value: 49.99 });
 *   PersonalizeAI.getRecommendations('for-you', { limit: 8 }).then(renderFn);
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? module.exports = factory()
    : typeof define === 'function' && define.amd
      ? define(factory)
      : (global.PersonalizeAI = factory());
}(this, function () {
  'use strict';

  // ── Internal state ──────────────────────────────────────────────────────
  var _config = {
    apiKey: null,
    baseUrl: 'https://api.personalizeai.com',
    apiVersion: 'v1',
    userId: null,
    sessionId: null,
    debug: false,
    autoTrack: true,
    renderDelay: 300,
    defaultLimit: 8,
    defaultTemplate: null,
    onRecommend: null,
    onTrack: null,
  };

  var _queue = [];       // events queued before init
  var _initialized = false;
  var _sessionTimeout = 30 * 60 * 1000; // 30 min
  var _lastActivity = Date.now();

  // ── Utilities ───────────────────────────────────────────────────────────

  function log() {
    if (_config.debug) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[PersonalizeAI]');
      console.log.apply(console, args);
    }
  }

  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getOrCreateUserId() {
    var stored = _getStorage('pai_uid');
    if (!stored) {
      stored = 'anon_' + generateId();
      _setStorage('pai_uid', stored);
    }
    return stored;
  }

  function getOrCreateSessionId() {
    var now = Date.now();
    var stored = _getStorage('pai_sid');
    var storedTime = parseInt(_getStorage('pai_sid_t') || '0', 10);
    if (!stored || (now - storedTime) > _sessionTimeout) {
      stored = 'sess_' + generateId();
      _setStorage('pai_sid', stored);
    }
    _setStorage('pai_sid_t', String(now));
    return stored;
  }

  function _getStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function _setStorage(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  function apiUrl(path) {
    return _config.baseUrl + '/api/' + _config.apiVersion + path;
  }

  function fetchJson(url, options) {
    return fetch(url, Object.assign({
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': _config.apiKey,
      }
    }, options)).then(function (res) {
      if (!res.ok) throw new Error('PersonalizeAI API error: ' + res.status);
      return res.json();
    });
  }

  // ── Context helpers ──────────────────────────────────────────────────────

  function _buildContext() {
    return {
      url: window.location.href,
      referrer: document.referrer,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      is_mobile: /Mobi|Android/i.test(navigator.userAgent),
      viewport_width: window.innerWidth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  function _getCurrentItemId() {
    // Try meta tag first
    var meta = document.querySelector('meta[name="pai:item-id"]');
    if (meta) return meta.getAttribute('content');
    // Try data attribute on body
    if (document.body.dataset && document.body.dataset.paiItemId) return document.body.dataset.paiItemId;
    // Try og:url pattern matching (e-commerce product pages)
    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      var match = ogUrl.getAttribute('content').match(/\/products?\/([^/?#]+)/i);
      if (match) return match[1];
    }
    return null;
  }

  // ── Tracking ─────────────────────────────────────────────────────────────

  function track(eventType, options) {
    options = options || {};
    var payload = {
      user_id: _config.userId || getOrCreateUserId(),
      item_id: options.itemId || options.item_id || _getCurrentItemId() || '__unknown__',
      event_type: eventType,
      value: options.value || 1.0,
      session_id: _config.sessionId || getOrCreateSessionId(),
      context: Object.assign(_buildContext(), options.context || {}),
    };

    if (!_initialized) {
      _queue.push(payload);
      return Promise.resolve({ queued: true });
    }

    log('track', eventType, payload.item_id);
    if (_config.onTrack) _config.onTrack(eventType, payload);

    return fetchJson(apiUrl('/events/track'), {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(function (e) {
      log('track error', e);
    });
  }

  function _flushQueue() {
    if (!_queue.length) return;
    var batch = _queue.splice(0);
    fetchJson(apiUrl('/events/batch'), {
      method: 'POST',
      body: JSON.stringify({ events: batch }),
    }).catch(function (e) {
      log('batch flush error', e);
    });
  }

  // ── Auto-tracking ─────────────────────────────────────────────────────────

  function _setupAutoTracking() {
    // Page view
    track('view', { itemId: _getCurrentItemId() });

    // Click tracking on [data-pai-item] elements
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-pai-item]');
      if (el) {
        track('click', { itemId: el.dataset.paiItem });
      }
      // Add to cart buttons
      var cartBtn = e.target.closest('[data-pai-add-cart], .add-to-cart, #add-to-cart, .btn-cart');
      if (cartBtn) {
        var itemId = (cartBtn.dataset && cartBtn.dataset.paiItem) || _getCurrentItemId();
        track('add_to_cart', { itemId: itemId });
      }
    }, true);

    // Shopify / WooCommerce purchase detection via URL
    if (/\/order[s_-]?\/|\/checkout\/order-received\//i.test(window.location.pathname)) {
      var purchasedItems = _getPurchasedItemsFromPage();
      purchasedItems.forEach(function (item) {
        track('purchase', item);
      });
    }

    // Like / wishlist buttons
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-pai-like], .wishlist-btn, .favourite-btn');
      if (btn) {
        var itemId = (btn.dataset && btn.dataset.paiLike) || _getCurrentItemId();
        track('like', { itemId: itemId });
      }
    }, true);

    // Session activity heartbeat
    ['click', 'scroll', 'keypress'].forEach(function (evt) {
      window.addEventListener(evt, function () { _lastActivity = Date.now(); }, { passive: true });
    });
  }

  function _getPurchasedItemsFromPage() {
    // Try to extract purchased items from order confirmation page
    var items = [];
    document.querySelectorAll('[data-pai-purchased]').forEach(function (el) {
      items.push({ itemId: el.dataset.paiPurchased, value: parseFloat(el.dataset.paiValue || '0') });
    });
    return items;
  }

  // ── Recommendations API ───────────────────────────────────────────────────

  function getRecommendations(surface, options) {
    options = options || {};
    var userId = _config.userId || getOrCreateUserId();
    var limit = options.limit || _config.defaultLimit;
    var params = new URLSearchParams({
      user_id: userId,
      limit: limit,
      include_item_data: options.includeItemData !== false,
    });

    if (options.excludeIds) params.set('exclude', options.excludeIds.join(','));
    if (options.category) params.set('category', options.category);

    var endpoint = {
      'for-you': '/recommend/for-you',
      'trending': '/recommend/trending',
      'top': '/recommend/top',
      'similar': '/recommend/similar',
      'continue': '/recommend/continue',
      'next-action': '/recommend/next-best-action',
      'because-actioned': '/recommend/because-you-actioned',
    }[surface] || '/recommend/for-you';

    if (surface === 'similar') {
      var itemId = options.itemId || _getCurrentItemId();
      if (!itemId) return Promise.reject(new Error('item_id required for similar surface'));
      params.set('item_id', itemId);
    }

    log('recommend', surface, params.toString());
    return fetchJson(apiUrl(endpoint + '?' + params.toString()));
  }

  // ── Widget Renderer ───────────────────────────────────────────────────────

  var _defaultItemTemplate = function (item) {
    var data = item.item_data || {};
    var img = data.image_url
      ? '<img src="' + data.image_url + '" alt="' + (data.title || '') + '" style="width:100%;height:180px;object-fit:cover;border-radius:8px 8px 0 0;">'
      : '<div style="width:100%;height:180px;background:#e5e7eb;border-radius:8px 8px 0 0;"></div>';
    var price = data.price ? '<span style="font-weight:700;color:#111;">' + (typeof data.price === 'number' ? '$' + data.price.toFixed(2) : data.price) + '</span>' : '';
    var url = data.url || '#';
    return '<a href="' + url + '" data-pai-item="' + item.item_id + '" style="text-decoration:none;color:inherit;display:block;background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.1);overflow:hidden;transition:transform .15s;cursor:pointer;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'"> '
      + img
      + '<div style="padding:12px 14px;">'
      + '<div style="font-size:14px;font-weight:500;color:#111;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (data.title || item.item_id) + '</div>'
      + price
      + '</div></a>';
  };

  var _surfaceTitles = {
    'for-you': 'Recommended For You',
    'trending': 'Trending Now',
    'top': 'Most Popular',
    'similar': 'You Might Also Like',
    'continue': 'Continue Where You Left Off',
    'next-action': 'We Think You\'ll Love This',
    'because-actioned': 'Because You Viewed',
  };

  function _renderWidget(container, surface, options) {
    options = options || {};
    var limit = parseInt(container.dataset.limit || options.limit || _config.defaultLimit, 10);
    var itemId = container.dataset.itemId || options.itemId;
    var category = container.dataset.category || options.category;
    var title = container.dataset.title || _surfaceTitles[surface] || 'Recommendations';
    var template = options.template || _config.defaultTemplate || _defaultItemTemplate;

    // Skeleton loader
    container.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:16px 0;">'
      + '<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:14px;">' + title + '</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;">'
      + Array(Math.min(limit, 4)).fill('<div style="height:240px;background:#f3f4f6;border-radius:8px;animation:pai-pulse 1.5s infinite;"></div>').join('')
      + '</div></div>';

    // Inject pulse animation once
    if (!document.getElementById('pai-styles')) {
      var style = document.createElement('style');
      style.id = 'pai-styles';
      style.textContent = '@keyframes pai-pulse{0%,100%{opacity:1}50%{opacity:.5}}';
      document.head.appendChild(style);
    }

    getRecommendations(surface, { limit: limit, itemId: itemId, category: category, includeItemData: true })
      .then(function (data) {
        var recs = data.recommendations || [];
        if (!recs.length) {
          container.innerHTML = '';
          return;
        }
        if (_config.onRecommend) _config.onRecommend(surface, recs, container);

        var grid = recs.map(template).join('');
        container.innerHTML = '<div style="font-family:system-ui,sans-serif;padding:16px 0;">'
          + '<div style="font-size:18px;font-weight:700;color:#111;margin-bottom:14px;">' + title + '</div>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;">'
          + grid
          + '</div></div>';

        log('rendered', recs.length, 'items for', surface);
      })
      .catch(function (e) {
        log('render error', surface, e);
        container.innerHTML = '';
      });
  }

  function _scanAndRender() {
    document.querySelectorAll('[data-personalize]').forEach(function (el) {
      var surface = el.getAttribute('data-personalize');
      _renderWidget(el, surface, {});
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function init(config) {
    if (_initialized) {
      log('already initialised');
      return;
    }
    Object.assign(_config, config || {});

    if (!_config.apiKey) {
      console.error('[PersonalizeAI] apiKey is required');
      return;
    }

    _config.userId = _config.userId || getOrCreateUserId();
    _config.sessionId = getOrCreateSessionId();
    _initialized = true;

    log('initialised, userId=' + _config.userId);
    _flushQueue();

    if (_config.autoTrack !== false) {
      _setupAutoTracking();
    }

    // Render any pre-declared widgets
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        setTimeout(_scanAndRender, _config.renderDelay);
      });
    } else {
      setTimeout(_scanAndRender, _config.renderDelay);
    }
  }

  function setUser(userId, attributes) {
    _config.userId = userId;
    _setStorage('pai_uid', userId);
    log('userId set to', userId);
    // Optionally POST user attributes to API here
  }

  function renderWidget(selector, surface, options) {
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) { log('renderWidget: element not found', selector); return; }
    _renderWidget(el, surface, options || {});
  }

  function reset() {
    _setStorage('pai_uid', null);
    _setStorage('pai_sid', null);
    _config.userId = null;
    _config.sessionId = null;
    log('session reset');
  }

  return {
    init: init,
    track: track,
    setUser: setUser,
    getRecommendations: getRecommendations,
    renderWidget: renderWidget,
    reset: reset,
    version: '1.0.0',
  };
}));
