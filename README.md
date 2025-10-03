# InDesign JSON → PDF (Local Test)

Minimal starter to fill a one-page InDesign template with `{{placeholders}}` from a JSON file and export a PDF — all locally, via a `.jsx` script you run inside InDesign.

## Folder layout
indesign-json-pdf-starter/
├─ template/
│ └─ menu_template.indd ← You create this inside InDesign
├─ data/
│ └─ menu.json ← Example data (edit as you like)
├─ scripts/
│ └─ fill_template.jsx ← Run this in InDesign
├─ output/ ← PDF ends up here
└─ .gitignore

## Steps
1) Create the template
   - Open Adobe InDesign.
   - New Document → A4, single page.
   - Add a few text frames with these placeholders (use straight braces):
     - `{{title}}`
     - `{{restaurant}}`
     - `{{dish1}} — {{price1}}`
     - `{{dish2}} — {{price2}}`
   - Save as **`template/menu_template.indd`**.

2) Adjust data
   - Edit **`data/menu.json`** to your needs.

3) Run the script in InDesign
   - In InDesign: Window → Utilities → **Scripts**.
   - In the Scripts panel, right-click **User** → **Reveal in Finder** (macOS).
   - Copy `scripts/fill_template.jsx` into that “Scripts Panel” folder (or symlink to it).
   - Double-click **fill_template.jsx** to run.
   - The script reads `data/menu.json`, opens `template/menu_template.indd`, replaces `{{...}}`, and exports **`output/menu.pdf`**.
   - It closes the document *without saving* to keep your template clean.

If macOS prompts for file access, grant Adobe InDesign permission (System Settings → Privacy & Security → Full Disk Access).
