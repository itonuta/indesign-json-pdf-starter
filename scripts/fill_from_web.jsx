/**
 * fill_from_web.jsx — Fetch JSON from a URL (or short code) → fill InDesign template → export PDF
 * 
 * Usage:
 *  - Run the online form (GitHub Pages), click "Upload". It shows a Code and a Fetch URL.
 *  - In InDesign: run this script; paste the Fetch URL, or paste just the Code.
 *  - The script downloads JSON, replaces {{placeholders}}, exports PDF to ./output/.
 */

(function () {
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.INTERACT_WITH_ALL;

    // === CONFIG: set your Apps Script EXEC_URL to allow "code only" input ===
    var DEFAULT_EXEC_URL = "PASTE_YOUR_EXEC_URL_HERE"; // e.g. https://script.google.com/macros/s/AKfycb.../exec
    // var SHARED_KEY = "optional-shared-key"; // if you enabled it, also append to fetch URL

    function repoRootFolder() {
        var scriptFile = File($.fileName);
        return scriptFile.parent.parent;
    }

    function ensureJSON() {
        if (typeof JSON === "undefined") JSON = {};
        if (!JSON.parse) JSON.parse = function (s) { return eval('(' + s + ')'); };
        if (!JSON.stringify) JSON.stringify = function (o) { return o.toSource(); };
    }

    function shellQuote(s) {
        return "'" + String(s).replace(/'/g, "'\\''") + "'";
    }
    function appleQuote(s) {
        return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    function curlToFile(url, destFile) {
        var cmd = '/usr/bin/curl -sS -L ' + shellQuote(url) + ' -o ' + shellQuote(destFile.fsName);
        var osa = 'do shell script ' + appleQuote(cmd);
        app.doScript(osa, ScriptLanguage.applescriptLanguage);
        if (!destFile.exists) throw new Error("Download failed.");
    }

    function readJSONFile(f) {
        ensureJSON();
        f.encoding = "UTF-8";
        if (!f.open("r")) throw new Error("Could not open downloaded JSON.");
        var txt = f.read(); f.close();
        return JSON.parse(txt);
    }

    function replacePlaceholders(doc, data) {
        app.findGrepPreferences = NothingEnum.NOTHING;
        app.changeGrepPreferences = NothingEnum.NOTHING;

        app.findGrepPreferences.findWhat = "\\{\\{([A-Za-z0-9_\\-\\.]+)\\}\\}";
        var hits = doc.findGrep();
        var missing = [];
        for (var i = 0; i < hits.length; i++) {
            var t = hits[i];
            var key = t.contents.slice(2, -2);
            var has = (data[key] !== undefined && data[key] !== null);
            var val = has ? String(data[key]) : "";
            if (!has && missing.indexOf(key) === -1) missing.push(key);
            t.contents = val;
        }
        app.findGrepPreferences = NothingEnum.NOTHING;
        app.changeGrepPreferences = NothingEnum.NOTHING;
        return missing;
    }

    function findPreset(names) {
        for (var i = 0; i < names.length; i++) {
            try {
                var p = app.pdfExportPresets.itemByName(names[i]);
                if (p && p.isValid) return p;
            } catch (e) {}
        }
        return null;
    }

    // --- Prompt for code or full URL ---
    var input = prompt("Paste the Fetch URL from the form, or paste the short Code:", "");
    if (!input) { alert("Cancelled."); return; }

    var url;
    if (/^https?:\/\//i.test(input)) {
        url = input;
    } else {
        // treat as code
        url = DEFAULT_EXEC_URL + "?id=" + encodeURIComponent(input);
        // if using a shared key: url += "&key=" + encodeURIComponent(SHARED_KEY);
    }

    var root = repoRootFolder();
    var templateFile = File(root.fsName + "/template/menu_template.indd");
    if (!templateFile.exists) {
        templateFile = File.openDialog("Select your InDesign template (.indd)", "*.indd");
        if (!templateFile) throw new Error("No template selected.");
    }

    var tmp = File(Folder.temp.fsName + "/menu_remote.json");
    if (tmp.exists) tmp.remove();
    curlToFile(url, tmp);
    var data = readJSONFile(tmp);

    // Open, fill, export
    var doc = app.open(templateFile, false);
    var missing = replacePlaceholders(doc, data);

    function sanitizeFileName(s) {
        if (!s) return "menu";
        return String(s).replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "");
    }
    var outputFolder = Folder(root.fsName + "/output");
    if (!outputFolder.exists) outputFolder.create();
    var base = sanitizeFileName(data.outputName || data.title || "menu");
    var pdfFile = File(outputFolder.fsName + "/" + base + ".pdf");

    var preset = findPreset([
        "High Quality Print", "Hoge kwaliteit afdrukken",
        "Press Quality", "Drukwerk kwaliteit",
        "Smallest File Size", "Kleinste bestandsomvang"
    ]);
    if (preset) {
        doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, preset);
    } else {
        doc.exportFile(ExportFormat.PDF_TYPE, pdfFile);
    }
    doc.close(SaveOptions.NO);

    var msg = "Fetched from:\n" + url + "\n\nPDF exported to:\n" + pdfFile.fsName;
    if (missing.length) msg += "\n\nNote: No data for keys → " + missing.join(", ");
    alert(msg);
})();
