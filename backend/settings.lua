local json = require("json")

local PLUGIN_DIR = (function()
    local src = debug.getinfo(1, "S").source or ""
    if src:sub(1, 1) == "@" then src = src:sub(2) end
    src = src:gsub("/", "\\")
    local dir = src:match("^(.+)\\[^\\]+$") or "."
    if dir:match("\\backend$") then
        dir = dir:match("^(.+)\\[^\\]+$") or dir
    end
    return dir
end)()

local SETTINGS_FILE = PLUGIN_DIR .. "\\settings.json"
local SETTINGS = {}

SETTINGS.DEFAULTS = {
    sites = {
        { name = "Online Fix",   url = "https://online-fix.me/",        searchType = "onlinefix", iconUrl = "https://i.imgur.com/WAXRAUw.png" },
        { name = "FitGirl",      url = "https://fitgirl-repacks.site/", searchType = "wordpress", iconUrl = "https://i.imgur.com/GOFbweI.png" },
        { name = "Dodi",         url = "https://dodi-repacks.site/",    searchType = "wordpress", iconUrl = "https://i.imgur.com/g71t1Ge.png" },
        { name = "RuTracker",    url = "https://rutracker.org/",        searchType = "rutracker", iconUrl = "https://i.imgur.com/wOjpyEc.png" },
        { name = "SteamRIP",     url = "https://steamrip.com/",         searchType = "wordpress", iconUrl = "https://www.google.com/s2/favicons?domain=steamrip.com&sz=32" },
        { name = "GLOAD",        url = "https://gload.to/",             searchType = "wordpress", iconUrl = "https://www.google.com/s2/favicons?domain=gload.to&sz=32" },
        { name = "CPG Repacks",  url = "http://cpgrepacks.site/",       searchType = "wordpress", iconUrl = "https://www.google.com/s2/favicons?domain=cpgrepacks.site&sz=32" },
        { name = "CS.RIN.RU",    url = "https://cs.rin.ru/forum/",      searchType = "csrinru",   iconUrl = "https://www.google.com/s2/favicons?domain=cs.rin.ru&sz=32" },
    }
}

function SETTINGS.save(data)
    local encoded = json.encode(data)
    if not encoded then
        return false
    end
    local f, err = io.open(SETTINGS_FILE, "w")
    if not f then
        return false
    end
    f:write(encoded)
    f:close()
    return true
end

function SETTINGS.load()
    local f = io.open(SETTINGS_FILE, "r")
    if not f then
        SETTINGS.save(SETTINGS.DEFAULTS)
        return SETTINGS.DEFAULTS
    end
    local content = f:read("*a")
    f:close()
    local ok, data = pcall(json.decode, content)
    if ok and type(data) == "table" and data.sites then
        return data
    end
    SETTINGS.save(SETTINGS.DEFAULTS)
    return SETTINGS.DEFAULTS
end

function SETTINGS.get_sites()
    return SETTINGS.load().sites
end

function SETTINGS.save_sites(sites)
    return SETTINGS.save({ sites = sites })
end

function SETTINGS.reset()
    SETTINGS.save(SETTINGS.DEFAULTS)
    return SETTINGS.DEFAULTS
end

return SETTINGS
