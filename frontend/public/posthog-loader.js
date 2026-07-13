/* Chargé uniquement après consentement explicite. */
(function (d, ph) {
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
    capture_pageview: true,
    persistence: "localStorage"
  });
})(document, window.posthog || []);
