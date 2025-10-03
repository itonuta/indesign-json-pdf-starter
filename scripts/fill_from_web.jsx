/**
 * fill_from_web.jsx — Fetch JSON via code or full URL → fill template → export PDF
 */
(function () {
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.INTERACT_WITH_ALL;

    // >>>>>>> REPLACE with your Apps Script Web App URL (in quotes) <<<<<<<
    var DEFAULT_EXEC_URL = "https://script.google.com/macros/s/AKfycbzcSgd9vF8NJ1evq98u8tY2cYGZm7b_bhU7tKuZmSYzjpf7uXVPoVl7qK6UeSbXgRxJMw/exec";
    // var SHARED_KEY = ""; // optional: if you added ?key=... protection

    function repoRootFolder() {
        var scriptFile = File($.fileName);
        return scriptFile.parent.parent;
    }
    function ensureJSON() {
        if (typeof JSON === "undefined") JSON = {};
        if (!JSON.parse) JSON.parse = function (s) { return eval('(' + s + ')'); };
        if (!JSON.stringify) JSON.stringify = function (o) { return o.toSource(); };
    }
    function appleQuote(s) {
        return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }

    function replacePlaceholders(doc, data) {
        app.findGrepPreferences = NothingEnum.NOTHING;
        app.changeGrepPreferences = NothingEnum.NOTHING;
        app.findGrepPreferences.findWhat = "\\{\\{([A-Za-z0-9_\\-\\.]+)\\}\\}";
        var hits = doc.findGrep(), missing = [];
        for (var i = 0; i < hits.length; i++) {
            var t = hits[i], key = t.contents.slice(2, -2);
            var has = (data[key] !== undefined && data[key] !== null);
            t.contents = has ? String(data[key]) : "";
            if (!has && missing.indexOf(key) === -1) missing.push(key);
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
    function sanitizeFileName(s) {
        if (!s) return "menu";
        return String(s).replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "");
    }

    // --- Ask for code or full URL ---
    var input = prompt("Paste the Fetch URL from the form, or paste just the Code:", "");
    if (!input) { alert("Cancelled."); return; }

    var url;
    if (/^https?:\/\//i.test(input)) {
        url = input;
    } else {
        url = DEFAULT_EXEC_URL + "?id=" + encodeURIComponent(input);
        // if (SHARED_KEY) url += "&key=" + encodeURIComponent(SHARED_KEY);
    }

    var root = repoRootFolder();
    var templateFile = File(root.fsName + "/template/menu_template.indd");
    if (!templateFile.exists) {
        templateFile = File.openDialog("Select your InDesign template (.indd)", "*.indd");
        if (!templateFile) { alert("No template selected."); return; }
    }

    // Download JSON to a temp file using AppleScript and quoted form (robust)
    var tmp = File(Folder.temp.fsName + "/menu_remote.json");
    if (tmp.exists) try { tmp.remove(); } catch (e) {}

    var osa = [
        'set theURL to ' + appleQuote(url),
        'set theDest to ' + appleQuote(tmp.fsName),
        'do shell script "/usr/bin/curl -sS -L " & quoted form of theURL & " -o " & quoted form of theDest
    ].join('\n');

    try {
        app.doScript(osa, ScriptLanguage.applescriptLanguage);
    } catch (e) {
        alert("Download failed while running AppleScript.\n\nAppleScript was:\n\n" + osa + "\n\nError:\n" + e);
        return;
    }
    if (!tmp.exists) {
        alert("Download failed (file not created).\nURL:\n" + url + "\n\nCheck that the code exists in Drive via the web app.");
        return;
    }

    // Read JSON
    ensureJSON();
    tmp.encoding = "UTF-8";
    if (!tmp.open("r")) { alert("Could not open downloaded JSON."); return; }
    var txt = tmp.read(); tmp.close();
    var data;
    try { data = JSON.parse(txt); } catch (e) {
        alert("Downloaded file is not valid JSON.\n\n" + txt.slice(0, 400) + "…");
        return;
    }

    // Fill & export
    var doc = app.open(templateFile, false);
    var missing = replacePlaceholders(doc, data);

    var outFolder = Folder(root.fsName + "/output");
    if (!outFolder.exists) outFolder.create();
    var base = sanitizeFileName(data.outputName || data.title || "menu");
    var pdfFile = File(outFolder.fsName + "/" + base + ".pdf");

    var preset = findPreset([
        "High Quality Print","Hoge kwaliteit afdrukken",
        "Press Quality","Drukwerk kwaliteit",
        "Smallest File Size","Kleinste bestandsomvang"
    ]);
    if (preset) doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, preset);
    else doc.exportFile(ExportFormat.PDF_TYPE, pdfFile);

    doc.close(SaveOptions.NO);

    var msg = "Fetched from:\n" + url + "\n\nPDF exported to:\n" + pdfFile.fsName;
    if (missing.length) msg += "\n\nNote: No data for keys → " + missing.join(", ");
    alert(msg);
})();
