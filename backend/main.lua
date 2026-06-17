local json = require("json")
local logger = require("logger")
local millennium = require("millennium")
local settings = require("settings")

local PLUGIN = "QSteam"

local function GetSitesSettingsIPC()
    local sites = settings.get_sites()
    return json.encode({ sites = sites })
end

local function SaveSitesSettingsIPC(args)
    logger:info(string.format("[%s] saveSitesSettingsIPC called, type=%s", PLUGIN, type(args)))
    local sites
    if type(args) == "string" then
        local ok, decoded = pcall(json.decode, args)
        if ok and type(decoded) == "table" then
            sites = decoded.sites or decoded
        end
    elseif type(args) == "table" then
        sites = args.sites or args[1]
    end
    if not sites or type(sites) ~= "table" or #sites == 0 then
        return json.encode({ error = "No sites provided" })
    end
    local ok = settings.save_sites(sites)
    if ok then
        logger:info(string.format("[%s] Settings saved, %d sites", PLUGIN, #sites))
        return json.encode({ success = true })
    else
        return json.encode({ error = "Failed to save settings" })
    end
end

local function ResetSitesSettingsIPC()
    local defaults = settings.reset()
    logger:info(string.format("[%s] Settings reset to defaults", PLUGIN))
    return json.encode({ success = true, sites = defaults.sites })
end

local function on_load()
    local ok, err = pcall(function()
        settings.get_sites()

        local sep = package.config:sub(1, 1)
        local jsPath = millennium.get_install_path() ..
            sep .. "plugins" .. sep .. "QSteam" .. sep .. ".millennium" .. sep .. "Dist" .. sep .. "index.js"
        local jsOk = millennium.add_browser_js(jsPath, ".*")
        if not jsOk then
            logger:warn(string.format("[%s] add_browser_js returned nil/0 — JS may not load", PLUGIN))
        end

        millennium.ready()
        logger:info(string.format("[%s] Backend ready", PLUGIN))
    end)

    if not ok then
        logger:error(string.format("[%s] Load error: %s", PLUGIN, tostring(err)))
    end
end

local function on_unload()
    logger:info(string.format("[%s] Plugin unloaded", PLUGIN))
end

GetSitesSettings = GetSitesSettingsIPC
SaveSitesSettings = SaveSitesSettingsIPC
ResetSitesSettings = ResetSitesSettingsIPC

return {
    on_load = on_load,
    on_unload = on_unload,
    GetSitesSettings = GetSitesSettingsIPC,
    SaveSitesSettings = SaveSitesSettingsIPC,
    ResetSitesSettings = ResetSitesSettingsIPC,
}
