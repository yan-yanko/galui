/**
 * galui.js — AI Readability Engine
 * Version: 2.0.0
 *
 * Drop this on any website to make it instantly readable by LLMs and AI agents.
 * - Auto-detects page type, content, forms, and CTAs
 * - Registers WebMCP tools (navigator.modelContext) where supported
 * - Logs AI agent traffic for analytics
 * - Pushes structured data to Galui backend
 * - Injects llms.txt link header
 *
 * Usage:
 *   <script src="https://api.galui.com/galui.js?key=cr_live_YOUR_KEY" async></script>
 */
(function (window, document) {
  'use strict';

  // ── Config from script tag ───────────────────────────────────────────────
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var src = script ? (script.src || '') : '';
  var params = {};
  var qIdx = src.indexOf('?');
  if (qIdx !== -1) {
    src.slice(qIdx + 1).split('&').forEach(function (p) {
      var kv = p.split('=');
      if (kv.length === 2) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    });
  }

  var TENANT_KEY  = params.key || '';
  var API_BASE    = params.api || 'https://api.galui.com';
  var DEBUG       = params.debug === '1';

  if (!TENANT_KEY) {
    console.warn('[galui] No API key provided. Add ?key=cr_live_... to script src.');
    return;
  }

  function log() {
    if (DEBUG) console.log.apply(console, ['[galui]'].concat(Array.prototype.slice.call(arguments)));
  }

  // ── Domain ───────────────────────────────────────────────────────────────
  var domain = window.location.hostname.replace(/^www\./, '');

  // ── 1. AI Agent Detection ────────────────────────────────────────────────
  // Detect if THIS page is being visited by an AI crawler/agent via User-Agent.
  // Also listens for AI-specific request headers where accessible.
  var AI_PATTERNS = [
    { pattern: /gptbot/i,            name: 'GPTBot',          type: 'crawler' },
    { pattern: /chatgpt-user/i,      name: 'ChatGPT',         type: 'llm'     },
    { pattern: /oai-searchbot/i,     name: 'OpenAI Search',   type: 'crawler' },
    { pattern: /claudebot/i,         name: 'ClaudeBot',       type: 'crawler' },
    { pattern: /claude-web/i,        name: 'Claude Web',      type: 'llm'     },
    { pattern: /anthropic-ai/i,      name: 'Anthropic',       type: 'crawler' },
    { pattern: /perplexitybot/i,     name: 'PerplexityBot',   type: 'crawler' },
    { pattern: /perplexity/i,        name: 'Perplexity',      type: 'llm'     },
    { pattern: /gemini/i,            name: 'Gemini',          type: 'llm'     },
    { pattern: /google-extended/i,   name: 'Google Extended', type: 'crawler' },
    { pattern: /bingbot/i,           name: 'BingBot',         type: 'crawler' },
    { pattern: /cohere-ai/i,         name: 'Cohere',          type: 'crawler' },
    { pattern: /youbot/i,            name: 'YouBot',          type: 'crawler' },
    { pattern: /diffbot/i,           name: 'Diffbot',         type: 'agent'   },
    { pattern: /amazonbot/i,         name: 'AmazonBot',       type: 'crawler' },
    { pattern: /meta-externalagent/i,name: 'MetaAI',          type: 'crawler' },
    { pattern: /facebookbot/i,       name: 'FacebookBot',     type: 'crawler' },
    { pattern: /applebot/i,          name: 'AppleBot',        type: 'crawler' },
    { pattern: /bytespider/i,        name: 'ByteSpider',      type: 'crawler' },
    { pattern: /webmcp/i,            name: 'WebMCP Agent',    type: 'agent'   },
  ];

  function detectAgent(ua) {
    for (var i = 0; i < AI_PATTERNS.length; i++) {
      if (AI_PATTERNS[i].pattern.test(ua)) {
        return { name: AI_PATTERNS[i].name, type: AI_PATTERNS[i].type };
      }
    }
    return null;
  }

  var userAgent = navigator.userAgent || '';
  var detectedAgent = detectAgent(userAgent);

  if (detectedAgent) {
    log('AI agent detected:', detectedAgent.name);
    _sendAnalyticsEvent(detectedAgent.name, detectedAgent.type);
  }

  function _sendAnalyticsEvent(agentName, agentType) {
    var payload = {
      domain: domain,
      page_url: window.location.href,
      agent_name: agentName,
      agent_type: agentType,
      user_agent: userAgent,
      referrer: document.referrer || null,
      ts: new Date().toISOString(),
    };
    _beacon(API_BASE + '/api/v1/analytics/event', payload);
  }

  // ── 2. Page Analysis ─────────────────────────────────────────────────────
  function _analyzePageType() {
    var path = window.location.pathname.toLowerCase();
    var title = (document.title || '').toLowerCase();

    if (path === '/' || path === '' || path === '/index' || path === '/home') return 'homepage';
    if (/\/(pricing|plans|price)/.test(path)) return 'pricing';
    if (/\/(docs|documentation|api|reference|guide)/.test(path)) return 'docs';
    if (/\/(blog|news|articles|post)/.test(path)) return 'blog';
    if (/\/(about|team|company)/.test(path)) return 'about';
    if (/\/(contact|support|help)/.test(path)) return 'contact';
    if (/\/(features?|product|solutions?)/.test(path)) return 'product';
    if (/\/(signup|register|trial)/.test(path)) return 'signup';
    if (/\/(login|signin)/.test(path)) return 'login';

    // Fallback: scan title
    if (/pricing|plans/.test(title)) return 'pricing';
    if (/docs|documentation/.test(title)) return 'docs';
    if (/blog|article/.test(title)) return 'blog';

    return 'other';
  }

  function _extractHeadings() {
    var headings = [];
    var els = document.querySelectorAll('h1, h2, h3');
    for (var i = 0; i < Math.min(els.length, 20); i++) {
      var text = (els[i].innerText || els[i].textContent || '').trim();
      if (text && text.length > 2 && text.length < 200) headings.push(text);
    }
    return headings;
  }

  function _extractCTAs() {
    var ctas = [];
    var seen = {};
    // Primary buttons + links with action-like text
    var els = document.querySelectorAll('a[class*="btn"], a[class*="button"], button, [role="button"]');
    var CTA_PATTERNS = /get started|sign up|try|start|buy|subscribe|contact|book|schedule|demo|free trial|learn more|explore/i;
    for (var i = 0; i < els.length; i++) {
      var text = (els[i].innerText || els[i].textContent || '').trim().replace(/\s+/g, ' ');
      if (text && text.length > 2 && text.length < 60 && CTA_PATTERNS.test(text) && !seen[text]) {
        ctas.push(text);
        seen[text] = true;
        if (ctas.length >= 10) break;
      }
    }
    return ctas;
  }

  function _extractForms() {
    var forms = [];
    var formEls = document.querySelectorAll('form');
    for (var i = 0; i < formEls.length; i++) {
      var form = formEls[i];
      var name = form.getAttribute('name') || form.getAttribute('id') || form.getAttribute('aria-label') || '';
      var action = form.getAttribute('action') || window.location.pathname;
      var method = (form.getAttribute('method') || 'GET').toUpperCase();

      // Extract field names
      var fields = [];
      var inputs = form.querySelectorAll('input:not([type=hidden]), select, textarea');
      for (var j = 0; j < inputs.length; j++) {
        var inp = inputs[j];
        var fieldName = inp.getAttribute('name') || inp.getAttribute('id') ||
                        inp.getAttribute('placeholder') || inp.getAttribute('aria-label') || '';
        var fieldType = inp.tagName === 'SELECT' ? 'select' :
                        inp.tagName === 'TEXTAREA' ? 'textarea' :
                        (inp.getAttribute('type') || 'text');
        if (fieldName) fields.push({ name: fieldName, type: fieldType });
      }

      if (fields.length > 0) {
        forms.push({ name: name, action: action, method: method, fields: fields });
      }
    }
    return forms;
  }

  function _extractSchemaOrg() {
    var schemas = [];
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      try {
        var data = JSON.parse(scripts[i].textContent || scripts[i].innerText);
        schemas.push(data);
      } catch (e) { /* ignore malformed */ }
    }
    return schemas;
  }

  function _extractMetaDescription() {
    var meta = document.querySelector('meta[name="description"]') ||
               document.querySelector('meta[property="og:description"]');
    return meta ? meta.getAttribute('content') : null;
  }

  function _extractTextPreview() {
    // Get clean text from main content area, avoid nav/footer noise
    var main = document.querySelector('main') ||
               document.querySelector('[role="main"]') ||
               document.querySelector('article') ||
               document.querySelector('.content') ||
               document.body;

    if (!main) return '';

    // Clone to avoid modifying DOM
    var clone = main.cloneNode(true);

    // Remove noisy elements
    var noisy = clone.querySelectorAll('nav, footer, header, script, style, noscript, iframe, [class*="cookie"], [class*="banner"], [class*="popup"], [id*="chat"]');
    for (var i = 0; i < noisy.length; i++) {
      noisy[i].parentNode && noisy[i].parentNode.removeChild(noisy[i]);
    }

    var text = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    return text.slice(0, 3000);
  }

  function _hashString(str) {
    // Simple FNV-1a 32-bit hash — fast, no crypto needed
    var hash = 2166136261;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash.toString(16);
  }

  // ── 3. WebMCP Integration ────────────────────────────────────────────────
  var registeredTools = [];
  var webmcpSupported = false;

  function _registerWebMCPTools(forms, pageType) {
    if (!navigator.modelContext || typeof navigator.modelContext.registerTool !== 'function') {
      log('WebMCP not available in this browser');
      return;
    }

    webmcpSupported = true;
    log('WebMCP supported — registering tools');

    // Register tools from forms
    forms.forEach(function (form) {
      if (!form.fields || form.fields.length === 0) return;

      var toolName = _formToToolName(form.name || form.action, pageType);
      var description = _formToDescription(form, pageType);
      var schema = _formToSchema(form);

      try {
        navigator.modelContext.registerTool({
          name: toolName,
          description: description,
          inputSchema: schema,
          handler: function (params) {
            return _handleWebMCPTool(form, params);
          },
        });

        registeredTools.push({ name: toolName, description: description, source: 'form', form_action: form.action });
        log('Registered WebMCP tool:', toolName);
      } catch (e) {
        log('Failed to register tool:', toolName, e);
      }
    });

    // Register page-level tools based on page type
    _registerPageTools(pageType);
  }

  function _formToToolName(nameOrAction, pageType) {
    var base = (nameOrAction || pageType || 'submit')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
      .toLowerCase();
    return base || 'form_submit';
  }

  function _formToDescription(form, pageType) {
    var fieldNames = (form.fields || []).map(function (f) { return f.name; }).join(', ');
    var descriptions = {
      'signup':   'Sign up for an account or start a free trial',
      'contact':  'Send a contact or support request message',
      'login':    'Log in to an existing account',
      'search':   'Search the site for content',
      'subscribe':'Subscribe to newsletter or updates',
      'booking':  'Book an appointment or schedule a demo',
    };
    for (var key in descriptions) {
      if ((form.name || form.action || '').toLowerCase().indexOf(key) !== -1) {
        return descriptions[key] + '. Fields: ' + fieldNames;
      }
    }
    return 'Submit the ' + (pageType || 'page') + ' form. Fields: ' + fieldNames;
  }

  function _formToSchema(form) {
    var properties = {};
    var required = [];

    (form.fields || []).forEach(function (field) {
      var type = field.type === 'number' ? 'number' :
                 field.type === 'checkbox' ? 'boolean' : 'string';

      properties[field.name] = {
        type: type,
        description: field.name + ' field',
      };

      if (['email', 'name', 'message', 'query'].indexOf(field.name.toLowerCase()) !== -1) {
        required.push(field.name);
      }
    });

    return { type: 'object', properties: properties, required: required };
  }

  function _registerPageTools(pageType) {
    if (!navigator.modelContext) return;

    // Navigation tool — always register
    try {
      navigator.modelContext.registerTool({
        name: 'get_page_info',
        description: 'Get structured information about this page including its type, title, and main content',
        inputSchema: { type: 'object', properties: {} },
        handler: function () {
          return {
            page_type: pageType,
            title: document.title,
            url: window.location.href,
            description: _extractMetaDescription(),
            headings: _extractHeadings(),
          };
        },
      });
      registeredTools.push({ name: 'get_page_info', source: 'auto' });
    } catch (e) {}

    // Pricing-specific tool
    if (pageType === 'pricing') {
      try {
        navigator.modelContext.registerTool({
          name: 'get_pricing',
          description: 'Get all pricing plans, tiers, and costs for this service',
          inputSchema: { type: 'object', properties: {} },
          handler: function () {
            return { pricing_page_url: window.location.href, content: _extractTextPreview() };
          },
        });
        registeredTools.push({ name: 'get_pricing', source: 'auto' });
      } catch (e) {}
    }
  }

  function _handleWebMCPTool(form, params) {
    // Return structured info about what the form does rather than submitting
    // (agents decide whether to fill/submit based on this info)
    return {
      form_action: form.action,
      form_method: form.method,
      fields: form.fields,
      provided_params: params,
      page_url: window.location.href,
    };
  }

  // ── 4. llms.txt link injection ───────────────────────────────────────────
  function _injectLlmsLink() {
    // Inject <link rel="llms" href="..."> in <head> so crawlers can discover llms.txt
    var existing = document.querySelector('link[rel="llms"]');
    if (existing) return;

    var link = document.createElement('link');
    link.setAttribute('rel', 'llms');
    link.setAttribute('href', API_BASE + '/registry/' + domain + '/llms.txt');
    link.setAttribute('type', 'text/plain');
    document.head && document.head.appendChild(link);

    // Also inject ai-plugin.json discovery
    var pluginLink = document.createElement('link');
    pluginLink.setAttribute('rel', 'ai-plugin');
    pluginLink.setAttribute('href', API_BASE + '/registry/' + domain + '/ai-plugin.json');
    pluginLink.setAttribute('type', 'application/json');
    document.head && document.head.appendChild(pluginLink);

    log('Injected llms.txt + ai-plugin.json discovery links');
  }

  // ── 5. Push to backend ───────────────────────────────────────────────────
  function _pushToBackend(pageData) {
    var textForHash = (pageData.text_preview || '') + (pageData.title || '') + JSON.stringify(pageData.headings);
    var contentHash = _hashString(textForHash);

    var payload = {
      domain: domain,
      tenant_key: TENANT_KEY,
      page: pageData,
      content_hash: contentHash,
      snippet_version: '2.0.0',
    };

    log('Pushing page data to backend', pageData.url);

    _fetch(API_BASE + '/api/v1/ingest/push', 'POST', payload, function (res) {
      if (res && res.score) {
        log('AI Readiness Score:', res.score.total + '/100 (' + res.score.grade + ')');
        if (res.status === 'accepted') {
          log('Registry update queued');
        } else if (res.status === 'skipped') {
          log('Content unchanged — skipped');
        }
      }
    });
  }

  // ── 6. HTTP helpers ──────────────────────────────────────────────────────
  function _beacon(url, data) {
    // Use sendBeacon for fire-and-forget (analytics)
    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      } catch (e) {}
    }
    // Fallback to async XHR
    _fetch(url, 'POST', data);
  }

  function _fetch(url, method, data, callback) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open(method || 'POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('X-Galui-Key', TENANT_KEY);
      xhr.timeout = 10000;
      if (callback) {
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
            try { callback(JSON.parse(xhr.responseText)); } catch (e) {}
          }
        };
      }
      xhr.send(JSON.stringify(data));
    } catch (e) {
      log('Request failed:', e);
    }
  }

  // ── 7. Main init ─────────────────────────────────────────────────────────
  function _init() {
    log('Initializing for domain:', domain);

    // Inject discovery links immediately
    _injectLlmsLink();

    // Analyze page
    var pageType   = _analyzePageType();
    var headings   = _extractHeadings();
    var ctas       = _extractCTAs();
    var forms      = _extractForms();
    var schemaOrg  = _extractSchemaOrg();
    var description= _extractMetaDescription();
    var textPreview= _extractTextPreview();

    log('Page type:', pageType, '| Forms:', forms.length, '| Headings:', headings.length);

    // Register WebMCP tools
    _registerWebMCPTools(forms, pageType);

    // Build page data payload
    var pageData = {
      url: window.location.href,
      title: document.title || '',
      description: description,
      page_type: pageType,
      headings: headings,
      ctas: ctas,
      forms: forms,
      schema_org: schemaOrg,
      text_preview: textPreview,
      webmcp_tools: registeredTools,
      webmcp_supported: webmcpSupported,
    };

    // Push to backend (debounced — only if content changed)
    _pushToBackend(pageData);
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    // DOM already ready (script loaded async after page)
    // Small delay to ensure dynamic content has settled
    setTimeout(_init, 100);
  }

  // ── Public API (window.galui) ────────────────────────────────────────────
  window.galui = {
    version: '2.0.0',
    domain: domain,
    getTools: function () { return registeredTools; },
    getScore: function (callback) {
      _fetch(API_BASE + '/api/v1/score/' + domain, 'GET', null, callback);
    },
    logAgentEvent: function (agentName, agentType) {
      _sendAnalyticsEvent(agentName, agentType);
    },
  };

  log('galui.js loaded — version 2.0.0');

}(window, document));
