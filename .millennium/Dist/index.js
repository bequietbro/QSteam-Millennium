(function () {
  const PLUGIN = "QSteam";

  let SITES = [];
  let sitesLoaded = false;
  let buttonsAdded = false;

  const FALLBACK_SITES = [
    { name: "Online Fix",   url: "https://online-fix.me/",        searchType: "onlinefix",   iconUrl: "https://i.imgur.com/WAXRAUw.png" },
    { name: "FitGirl",      url: "https://fitgirl-repacks.site/", searchType: "wordpress",   iconUrl: "https://i.imgur.com/GOFbweI.png" },
    { name: "Dodi",         url: "https://dodi-repacks.site/",    searchType: "wordpress",   iconUrl: "https://i.imgur.com/g71t1Ge.png" },
    { name: "RuTracker",    url: "https://rutracker.org/",        searchType: "rutracker",   iconUrl: "https://i.imgur.com/wOjpyEc.png" },
    { name: "SteamRIP",     url: "https://steamrip.com/",         searchType: "wordpress",   iconUrl: "https://www.google.com/s2/favicons?domain=steamrip.com&sz=32" },
    { name: "GLOAD",        url: "https://gload.to/",             searchType: "wordpress",   iconUrl: "https://www.google.com/s2/favicons?domain=gload.to&sz=32" },
    { name: "CPG Repacks",  url: "http://cpgrepacks.site/",       searchType: "wordpress",   iconUrl: "https://www.google.com/s2/favicons?domain=cpgrepacks.site&sz=32" },
    { name: "CS.RIN.RU",    url: "https://cs.rin.ru/forum/",      searchType: "csrinru",     iconUrl: "https://www.google.com/s2/favicons?domain=cs.rin.ru&sz=32" },
  ];

  const INIT_DELAY_MS = 500;
  const RETRY_DELAY_MS = 1000;
  const MAX_RETRIES = 10;

  async function callBackend(method, args) {
    try {
      const raw = await window.Millennium.callServerMethod("QSteam", method, args || {});
      if (typeof raw === "string") return JSON.parse(raw);
      return raw || null;
    } catch (e) {
      console.error(`[${PLUGIN}] IPC error (${method}):`, e);
      return null;
    }
  }

  async function loadSites() {
    if (sitesLoaded) return;
    const result = await callBackend("GetSitesSettings");
    if (result && result.sites && result.sites.length > 0) {
      SITES = result.sites;
    } else {
      SITES = FALLBACK_SITES;
    }
    sitesLoaded = true;
  }

  async function saveSites(sites) {
    const result = await callBackend("SaveSitesSettings", [JSON.stringify({ sites: sites })]);
    if (result && result.success) {
      SITES = sites;
      refreshGameButtons();
    }
    return result && result.success;
  }

  async function resetSites() {
    const result = await callBackend("ResetSitesSettings");
    if (result && result.sites) {
      SITES = result.sites;
    }
    return result;
  }

  function buildSearchURL(site, gameName) {
    const formatted = encodeURIComponent(
      gameName
        .toLowerCase()
        .replace(/['_™®©]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    );
    switch (site.searchType) {
      case "onlinefix":
        return `${site.url}index.php?do=search&subaction=search&story=${formatted}`;
      case "rutracker":
        return `${site.url}forum/tracker.php?nm=${formatted}`;
      case "csrinru":
        return `${site.url}search.php?keywords=${formatted}`;
      default:
        return `${site.url}?s=${formatted}`;
    }
  }

  function createSiteButton(site, searchURL) {
    const link = document.createElement("div");
    link.classList.add("site-item", "search-button");
    link.title = site.name;

    link.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2px;
      background: rgba(42, 42, 42, 0.4);
      border-radius: 8px;
      transition: transform 0.2s ease, background-color 0.2s ease;
      cursor: pointer;
      border: 2px solid transparent;
      width: 32px;
      height: 32px;
    `;

    const icon = document.createElement("img");
    icon.src = site.iconUrl;
    icon.classList.add("site-icon");
    icon.style.cssText = `
      width: 20px;
      height: 20px;
      object-fit: contain;
      border-radius: 3px;
      transition: transform 0.2s ease;
    `;

    link.appendChild(icon);

    link.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = `steam://openurl_external/${searchURL}`;
    });

    link.addEventListener("mouseover", () => {
      link.style.transform = "scale(1.1)";
      icon.style.transform = "scale(1.3)";
    });

    link.addEventListener("mouseout", () => {
      link.style.transform = "scale(1)";
      icon.style.transform = "scale(1)";
    });

    return link;
  }

  function refreshGameButtons() {
    if (!isGamePage()) return;
    var existing = document.querySelectorAll(".game-links-container");
    existing.forEach(function (el) { el.remove(); });
    var containers = findAllGameContainers();
    containers.forEach(function (container) {
      addGameLinks(container);
    });
  }

  function isVisible(el) {
    return el && el.offsetParent !== null;
  }

  function findGameContainer() {
    const primary = document.querySelector("#appHubAppName, .apphub_AppName");
    if (primary && isVisible(primary)) return primary;
    if (primary) {
      const appRoot = document.querySelector("#application_root");
      if (appRoot) {
        const first = appRoot.querySelector("h1, h2");
        if (first && isVisible(first)) return first;
      }
    }
    const appRoot = document.querySelector("#application_root");
    if (appRoot) {
      const first = appRoot.querySelector(
        "h1, h2, [class*=title], [class*=name], [class*=heading]",
      );
      if (first && isVisible(first) && first.textContent.trim().length > 0)
        return first;
    }
    return primary || null;
  }

  function findAllGameContainers() {
    const containers = [];
    const primarySelectors = ["#appHubAppName", ".apphub_AppName", ".game_name"];
    for (const sel of primarySelectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el) && el.textContent.trim().length > 0) {
        containers.push(el);
        return containers;
      }
    }
    const eventSelectors = [
      "[data-ds-appid] [class*=title]",
      "[data-ds-appid] [class*=name]",
      "[class*=sale_page] [class*=name_link]",
      "[class*=sale_item] [class*=title]",
      "[class*=event] [class*=title]",
      "a[href*='/app/'][class*='sale']",
    ];
    for (const sel of eventSelectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        els.forEach((el) => {
          if (isVisible(el) && el.textContent.trim().length > 0)
            containers.push(el);
        });
        if (containers.length > 0) break;
      }
    }
    if (containers.length > 0) return containers;
    const fallback = findGameContainer();
    if (fallback) containers.push(fallback);
    return containers;
  }

  function addGameLinks(container) {
    try {
      if (!sitesLoaded) return;
      if (!container) return;

      let insertParent = container.parentNode;
      let insertRef = container.nextSibling;

      if (!isVisible(container)) {
        const heading = findGameContainer();
        if (heading && heading !== container && isVisible(heading)) {
          insertParent = heading.parentNode;
          insertRef = heading.nextSibling;
        } else {
          return;
        }
      }

      if (!insertParent) return;

      if (insertParent.querySelector(".game-links-container")) return;

      const gameName = container.textContent.trim();
      if (!gameName) return;

      const wrapper = document.createElement("div");
      wrapper.classList.add("game-links-container");
      wrapper.style.cssText = `
        display: flex;
        flex-direction: row;
        gap: 5px;
        align-items: center;
        justify-content: center;
        width: 100%;
        margin: 6px 0;
      `;

      insertParent.insertBefore(wrapper, insertRef);

      SITES.forEach((site) => {
        const searchURL = buildSearchURL(site, gameName);
        const button = createSiteButton(site, searchURL);
        wrapper.appendChild(button);
      });
    } catch (err) {
      console.error(`[${PLUGIN}] Error adding links: ${err.message}`, err);
    }
  }

  function isGamePage() {
    return /^\/(app\/\d+|sale\/|events\/|bundles\/|sub\/)/.test(
      window.location.pathname,
    );
  }

  var React = window.SP_REACT;
  if (!React) {
    console.error("[QSteam] React (SP_REACT) not available, settings page will not work");
  }



  function QSteamSettings() {
    var useState = React.useState;
    var useEffect = React.useEffect;
    var h = React.createElement;
    var _useState = useState([]);
    var sites = _useState[0];
    var setSites = _useState[1];
    var _useState2 = useState(true);
    var loading = _useState2[0];
    var setLoading = _useState2[1];
    var _useState3 = useState(null);
    var statusMsg = _useState3[0];
    var setStatusMsg = _useState3[1];
    var _useState4 = useState(false);
    var isStatusSuccess = _useState4[0];
    var setIsStatusSuccess = _useState4[1];
    var _useState5 = useState(-1);
    var editIdx = _useState5[0];
    var setEditIdx = _useState5[1];
    var _useState6 = useState(false);
    var showModal = _useState6[0];
    var setShowModal = _useState6[1];
    var _useState7 = useState({ name: "", url: "", searchType: "wordpress", iconUrl: "" });
    var formData = _useState7[0];
    var setFormData = _useState7[1];

    useEffect(function () {
      (async function () {
        await loadSites();
        setSites(SITES);
        setLoading(false);
      })();
    }, []);

    function showStatus(msg, success) {
      setStatusMsg(msg);
      setIsStatusSuccess(success);
      setTimeout(function () { setStatusMsg(null); }, 3000);
    }
    async function handleDelete(idx) {
      var updated = sites.filter(function (_, i) { return i !== idx; });
      var ok = await saveSites(updated);
      if (ok) {
        setSites(updated);
        showStatus("Site deleted", true);
      } else {
        showStatus("Failed to save", false);
      }
    }
    async function handleReset() {
      var result = await resetSites();
      if (result && result.sites) {
        setSites(result.sites);
        showStatus("Reset to defaults", true);
      }
    }
    function openAddModal() {
      setFormData({ name: "", url: "", searchType: "wordpress", iconUrl: "" });
      setEditIdx(-1);
      setShowModal(true);
    }
    function openEditModal(idx) {
      setFormData({ name: sites[idx].name, url: sites[idx].url, searchType: sites[idx].searchType, iconUrl: sites[idx].iconUrl || "" });
      setEditIdx(idx);
      setShowModal(true);
    }
    async function handleModalSave() {
      if (!formData.name || !formData.url) {
        return;
      }
      var updated;
      if (editIdx >= 0) {
        updated = sites.map(function (s, i) { return i === editIdx ? formData : s; });
      } else {
        updated = sites.concat([formData]);
      }
      var ok = await saveSites(updated);
      if (ok) {
        setSites(updated);
        setShowModal(false);
        showStatus(editIdx >= 0 ? "Site updated" : "Site added", true);
      } else {
        showStatus("Failed to save", false);
      }
    }

    var containerStyle = {
      padding: "16px",
      color: "#e0e0e0",
      fontFamily: "Arial, sans-serif"
    };
    var tableStyle = {
      width: "100%",
      borderCollapse: "collapse"
    };
    var thStyle = {
      textAlign: "left",
      padding: "8px 6px",
      color: "#999",
      fontSize: "12px",
      borderBottom: "1px solid #333"
    };
    var tdStyle = {
      padding: "6px",
      borderBottom: "1px solid #2a2a2a",
      verticalAlign: "middle"
    };
    var inputStyle = {
      width: "100%",
      padding: "4px 6px",
      background: "#1a1a1a",
      border: "1px solid #333",
      borderRadius: "3px",
      color: "#e0e0e0",
      fontSize: "12px",
      boxSizing: "border-box",
      outline: "none"
    };
    var selectStyle = {
      width: "100%",
      padding: "4px 6px",
      background: "#1a1a1a",
      border: "1px solid #333",
      borderRadius: "3px",
      color: "#e0e0e0",
      fontSize: "12px"
    };
    var statusBaseStyle = {
      marginTop: "8px",
      padding: "6px 10px",
      borderRadius: "4px",
      fontSize: "12px"
    };
    var statusSuccessStyle = Object.assign({}, statusBaseStyle, {
      background: "#1b5e20",
      color: "#a5d6a7"
    });
    var statusErrorStyle = Object.assign({}, statusBaseStyle, {
      background: "#b71c1c",
      color: "#ef9a9a"
    });
    var emptyCellStyle = {
      textAlign: "center",
      padding: "24px",
      color: "#666",
      fontSize: "14px"
    };

    var buttonStyle = {
      padding: "6px 12px",
      borderRadius: "6px",
      border: "1px solid rgba(255,255,255,0.15)",
      background: "rgba(255,255,255,0.07)",
      color: "#fff",
      fontSize: "12px",
      cursor: "pointer",
      transition: "background 0.2s"
    };
    var buttonHoverStyle = { background: "rgba(255,255,255,0.15)" };

    var buttonDangerStyle = Object.assign({}, buttonStyle, {
      background: "#e53935",
      borderColor: "rgba(255,255,255,0.2)"
    });
    var buttonDangerHoverStyle = { background: "#ef5350" };

    var buttonPrimaryStyle = Object.assign({}, buttonStyle, {
      background: "#4a9eff",
      borderColor: "rgba(255,255,255,0.2)"
    });
    var buttonPrimaryHoverStyle = { background: "#5aafff" };

    function makeHoverHandlers(normalStyle, hoverStyle) {
      return {
        onMouseEnter: function(e) {
          for (var key in hoverStyle) e.target.style[key] = hoverStyle[key];
        },
        onMouseLeave: function(e) {
          for (var key in normalStyle) e.target.style[key] = normalStyle[key];
        }
      };
    }

    if (loading) {
      return h("div", { style: { padding: 16, color: "rgba(255,255,255,0.4)", textAlign: "center", fontSize: 14 } }, "Loading...");
    }

    var rows = [];
    if (sites.length === 0) {
      rows.push(h("tr", { key: "empty" },
        h("td", { colSpan: 4, style: emptyCellStyle }, "No sites configured. Click '+ Add Site' to add one.")
      ));
    } else {
      sites.forEach(function (site, idx) {
        rows.push(h("tr", { key: idx },
          h("td", { style: tdStyle }, site.name),
          h("td", { style: { ...tdStyle, fontSize: 11, color: "#999", wordBreak: "break-all" } }, site.url),
          h("td", { style: tdStyle }, site.searchType),
          h("td", { style: tdStyle },
            h("div", { style: { display: "flex", gap: 4 } },
              h("button", Object.assign({
                style: buttonStyle,
                onClick: function () { openEditModal(idx); }
              }, makeHoverHandlers(buttonStyle, buttonHoverStyle)), "Edit"),
              h("button", Object.assign({
                style: buttonDangerStyle,
                onClick: function () { handleDelete(idx); }
              }, makeHoverHandlers(buttonDangerStyle, buttonDangerHoverStyle)), "Delete")
            )
          )
        ));
      });
    }

    var modal = null;
    if (showModal) {
      modal = h("div", {
        style: {
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 99999
        },
        onClick: function () { setShowModal(false); }
      },
        h("div", {
          style: {
            background: "#1e1e1e", border: "1px solid #333", borderRadius: 8,
            padding: 24, width: 420, maxWidth: "90vw"
          },
          onClick: function (e) { e.stopPropagation(); }
        },
          h("h3", { style: { margin: "0 0 16px", color: "#fff", fontSize: 16 } },
            editIdx >= 0 ? "Edit Site" : "Add Site"
          ),
          h("div", { style: { marginBottom: 12 } },
            h("label", { style: { display: "block", fontSize: 12, color: "#999", marginBottom: 4 } }, "Name"),
            h("input", {
              style: inputStyle,
              value: formData.name,
              onChange: function (e) { setFormData(Object.assign({}, formData, { name: e.target.value })); }
            })
          ),
          h("div", { style: { marginBottom: 12 } },
            h("label", { style: { display: "block", fontSize: 12, color: "#999", marginBottom: 4 } }, "URL"),
            h("input", {
              style: inputStyle,
              value: formData.url,
              onChange: function (e) { setFormData(Object.assign({}, formData, { url: e.target.value })); }
            })
          ),
          h("div", { style: { marginBottom: 12 } },
            h("label", { style: { display: "block", fontSize: 12, color: "#999", marginBottom: 4 } }, "Search Type"),
            h("select", {
              style: selectStyle,
              value: formData.searchType,
              onChange: function (e) { setFormData(Object.assign({}, formData, { searchType: e.target.value })); }
            },
              h("option", { value: "wordpress" }, "WordPress (?s=)"),
              h("option", { value: "onlinefix" }, "Online Fix (search)"),
              h("option", { value: "rutracker" }, "RuTracker (nm=)"),
              h("option", { value: "csrinru" }, "CS.RIN.RU (keywords=)")
            )
          ),
          h("div", { style: { marginBottom: 16 } },
            h("label", { style: { display: "block", fontSize: 12, color: "#999", marginBottom: 4 } }, "Icon URL"),
            h("input", {
              style: inputStyle,
              value: formData.iconUrl,
              onChange: function (e) { setFormData(Object.assign({}, formData, { iconUrl: e.target.value })); }
            })
          ),
          h("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
            h("button", Object.assign({
              style: buttonStyle,
              onClick: function () { setShowModal(false); }
            }, makeHoverHandlers(buttonStyle, buttonHoverStyle)), "Cancel"),
            h("button", Object.assign({
              style: buttonPrimaryStyle,
              onClick: handleModalSave
            }, makeHoverHandlers(buttonPrimaryStyle, buttonPrimaryHoverStyle)), editIdx >= 0 ? "Save" : "Add")
          )
        )
      );
    }

    var statusEl = null;
    if (statusMsg) {
      statusEl = h("div", { style: isStatusSuccess ? statusSuccessStyle : statusErrorStyle }, statusMsg);
    }

    return h("div", { style: containerStyle },
      h("div", { style: { display: "flex", gap: 6, justifyContent: "center" } },
        h("button", Object.assign({
          style: buttonStyle,
          onClick: openAddModal
        }, makeHoverHandlers(buttonStyle, buttonHoverStyle)), "+ Add Site"),
        h("button", Object.assign({
          style: buttonStyle,
          onClick: handleReset
        }, makeHoverHandlers(buttonStyle, buttonHoverStyle)), "⟳ Reset Defaults")
      ),
      statusEl,
      h("table", { style: tableStyle },
        h("thead", null,
          h("tr", null,
            h("th", { style: thStyle }, "Name"),
            h("th", { style: thStyle }, "URL"),
            h("th", { style: thStyle }, "Search Type"),
            h("th", { style: thStyle }, "Actions")
          )
        ),
        h("tbody", null, rows)
      ),
      modal
    );
  }



  function registerSettingsPage() {
    window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS =
      window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS || {};

    var contentEl = null;
    if (React) {
      contentEl = React.createElement(QSteamSettings);
    } else {
      contentEl = "QSteam - settings require SP_REACT";
    }

    window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS["QSteam"] = {
      title: "QSteam",
      icon: null,
      content: contentEl,
    };

  }

  async function initPlugin() {
    registerSettingsPage();
    await loadSites();

    if (!isGamePage()) return;

    for (let i = 0; i < MAX_RETRIES; i++) {
      const containers = findAllGameContainers();
      if (containers.length > 0) {
        containers.forEach(function (container) {
          if (!container.parentNode.querySelector(".game-links-container")) {
            addGameLinks(container);
          }
        });
        buttonsAdded = true;
        return;
      }
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  setTimeout(initPlugin, INIT_DELAY_MS);

  let lastUrl = location.href;
  const observer = new MutationObserver(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      buttonsAdded = false;
      setTimeout(initPlugin, INIT_DELAY_MS);
      return;
    }

    if (buttonsAdded || !sitesLoaded || !isGamePage()) return;

    const containers = findAllGameContainers();
    containers.forEach(function (container) {
      if (!container.parentNode.querySelector(".game-links-container")) {
        addGameLinks(container);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
