/**
 * fill_template.jsx — Minimal JSON → InDesign placeholder replacer → PDF exporter
 * 
 * How it works:
 *  - Reads ./data/menu.json (relative to this script's parent folder).
 *  - Opens ./template/menu_template.indd (or lets you pick if missing).
 *  - Replaces all {{key}} placeholders found in text with values from the JSON.
 *  - Exports a PDF to ./output/<outputName or title or 'menu'>.pdf
 *  - Closes the document without saving changes.
 *
 * Placeholders:
 *   Use double curly braces in text frames, e.g. {{title}}, {{dish1}}, {{price1}}
 *
 * Notes:
 *   - This is intentionally minimal. No advanced layout logic yet.
 *   - Only use trusted JSON files. For legacy ExtendScript versions, JSON.parse fallback uses eval().
 */

(function () {
    app.scriptPreferences.userInteractionLevel = UserInteractionLevels.INTERACT_WITH_ALL;

    // --- Helpers ------------------------------------------------------------------
    function repoRootFolder() {
        // This script sits in <repo>/scripts/fill_template.jsx → go up one level
        var scriptFile = File($.fileName);
        return scriptFile.parent.parent;
    }

    function ensureJSON() {
        if (typeof JSON === "undefined") {
            JSON = {};
        }
        if (!JSON.parse) {
            // Minimal fallback: for trusted input only
            JSON.parse = function (s) { return eval('(' + s + ')'); };
        }
        if (!JSON.stringify) {
            JSON.stringify = function (o) { return o.toSource(); };
        }
    }

    function readJSON(file) {
        ensureJSON();
        if (!file || !file.exists) {
            throw new Error("JSON file not found: " + (file ? file.fsName : "(null)"));
        }
        file.encoding = "UTF-8";
        if (!file.open("r")) throw new Error("Could not open JSON file for reading.");
        var content = file.read();
        file.close();
        return JSON.parse(content);
    }

    function sanitizeFileName(s) {
        if (!s) return "menu";
        return String(s).replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "");
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

    function replacePlaceholders(doc, data) {
        app.findGrepPreferences = NothingEnum.NOTHING;
        app.changeGrepPreferences = NothingEnum.NOTHING;

        app.findGrepPreferences.findWhat = "\\{\\{([A-Za-z0-9_\\-\\.]+)\\}\\}";
        var hits = doc.findGrep();

        var missing = [];
        for (var i = 0; i < hits.length; i++) {
            var t = hits[i]; // Text object
            var full = t.contents;          // e.g. "{{title}}"
            var key = full.slice(2, -2);    // -> "title"
            var has = (data[key] !== undefined && data[key] !== null);
            var val = has ? String(data[key]) : "";
            if (!has && missing.indexOf(key) === -1) missing.push(key);
            t.contents = val;
        }

        app.findGrepPreferences = NothingEnum.NOTHING;
        app.changeGrepPreferences = NothingEnum.NOTHING;
        return missing;
    }

    // --- Main ---------------------------------------------------------------------
    var root = repoRootFolder();
    var dataFile = File(root.fsName + "/data/menu.json");
    var templateFile = File(root.fsName + "/template/menu_template.indd");
    var outputFolder = Folder(root.fsName + "/output");

    if (!outputFolder.exists) outputFolder.create();

    // Read JSON
    var data = readJSON(dataFile);

    // Open template (or ask for it if missing)
    if (!templateFile.exists) {
        templateFile = File.openDialog("Select your InDesign template (.indd)", "*.indd");
        if (!templateFile) throw new Error("No template selected.");
    }

    var doc = app.open(templateFile, false);

    // Replace all {{key}} with JSON values
    var missing = replacePlaceholders(doc, data);

    // Choose output filename
    var base = sanitizeFileName(data.outputName || data.title || "menu");
    var pdfFile = File(outputFolder.fsName + "/" + base + ".pdf");

    // Export to PDF; try to find a sensible preset (both EN and NL names covered)
    var preset = findPreset([
        "High Quality Print", "Hoge kwaliteit afdrukken",
        "Press Quality", "Drukwerk kwaliteit",
        "Smallest File Size", "Kleinste bestandsomvang"
    ]);

    if (preset) {
        doc.exportFile(ExportFormat.PDF_TYPE, pdfFile, false, preset);
    } else {
        // Fall back to current PDF export prefs
        doc.exportFile(ExportFormat.PDF_TYPE, pdfFile);
    }

    // Close without saving changes to keep the template clean
    doc.close(SaveOptions.NO);

    var msg = "PDF exported to:\\n" + pdfFile.fsName;
    if (missing.length) {
        msg += "\\n\\nNote: No data for keys → " + missing.join(", ");
    }
    alert(msg);
})();
