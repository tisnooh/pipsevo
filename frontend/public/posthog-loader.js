/* Chargé uniquement après consentement explicite. */
(function (d, ph) {
  var consentScript = d.getElementById("pipsevo-posthog");
  if (!consentScript || consentScript.dataset.analyticsConsent !== "granted") return;
  if (typeof window.__pipsevoAnalyticsConsentCheck !== "function" || !window.__pipsevoAnalyticsConsentCheck()) return;
  var path = window.location.pathname;
  if (path.indexOf("/auth/") === 0 || ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"].indexOf(path) !== -1) return;
  var sensitiveKeys = ["access_token", "refresh_token", "code", "token", "token_hash", "error_description"];
  if ([window.location.search, window.location.hash].some(function (part) {
    var params = new URLSearchParams(part.replace(/^[?#]/, ""));
    return sensitiveKeys.some(function (key) { return params.has(key); });
  })) return;
  if (ph.__SV) return;
  window.posthog = ph;
  ph._i = [];
  ph.init = function (key, config, name) {
    function stub(obj, method) { obj[method] = function () { obj.push([method].concat(Array.prototype.slice.call(arguments, 0))); }; }
    var script = d.createElement("script");
    script.type = "text/javascript";
    script.crossOrigin = "anonymous";
    script.async = true;
    script.src = config.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
    d.getElementsByTagName("script")[0].parentNode.insertBefore(script, d.getElementsByTagName("script")[0]);
    var target = name ? (ph[name] = []) : ph;
    target.people = target.people || [];
    ["capture","identify","reset","opt_in_capturing","opt_out_capturing","has_opted_in_capturing","has_opted_out_capturing","set_config"].forEach(function (method) { stub(target, method); });
    ph._i.push([key, config, name]);
  };
  ph.__SV = 1;
  ph.init("phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs", {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
    autocapture: false,
    disable_session_recording: true,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_performance: false,
    rageclick: false,
    disable_surveys: true,
    opt_out_capturing_by_default: true,
    before_send: function (event) {
      if (!window.__pipsevoAnalyticsConsentCheck || !window.__pipsevoAnalyticsConsentCheck()) return null;
      try {
        var properties = Object.assign({}, event.properties);
        ["$current_url", "$initial_current_url", "$referrer", "$initial_referrer"].forEach(function (key) {
          if (!properties[key]) return;
          var url = new URL(properties[key]);
          url.search = "";
          url.hash = "";
          if (/^\/(app|admin)(\/|$)/.test(url.pathname)) url.pathname = "/" + url.pathname.split("/").filter(Boolean).slice(0, 2).join("/");
          properties[key] = url.href;
        });
        ["$pathname", "$initial_pathname"].forEach(function (key) {
          if (typeof properties[key] === "string" && /^\/(app|admin)(\/|$)/.test(properties[key])) properties[key] = "/" + properties[key].split("/").filter(Boolean).slice(0, 2).join("/");
        });
        return Object.assign({}, event, { properties: properties });
      } catch (_) { return null; }
    },
    persistence: "localStorage"
  });
})(document, window.posthog || []);
